<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Database;
use App\Core\Phone;
use App\Core\Points;
use App\Core\Response;
use App\Core\Sql;
use PDO;

/**
 * Transaksi poin (buku besar). Hanya kasir/admin yang boleh menulis ke sini.
 *
 * Satu baris = satu belanja: berapa total belanjanya, berapa poin yang
 * ditukar, dan berapa poin yang didapat. Saldo pelanggan = jumlah poin
 * didapat dikurangi poin dipakai, jadi menghapus baris langsung mengoreksi
 * saldo tanpa perlu menyentuh tabel lain.
 */
final class PointController
{
    public static function rapikanTransaksi(array $row): array
    {
        $out = [
            'id'            => (int)$row['id'],
            'total_belanja' => (int)$row['total_belanja'],
            'poin_dipakai'  => (int)$row['poin_dipakai'],
            'potongan'      => (int)$row['potongan'],
            'total_bayar'   => (int)$row['total_bayar'],
            'poin_didapat'  => (int)$row['poin_didapat'],
            'catatan'       => isset($row['catatan']) ? $row['catatan'] : null,
            'created_by'    => isset($row['created_by']) ? $row['created_by'] : null,
            'created_at'    => $row['created_at'],
        ];
        if (isset($row['member_id']))   $out['member_id']   = (int)$row['member_id'];
        if (isset($row['member_name'])) $out['member_name'] = $row['member_name'];
        if (isset($row['member_phone'])) {
            $out['member_phone']   = $row['member_phone'];
            $out['member_phone_display'] = Phone::display((string)$row['member_phone']);
        }
        return $out;
    }

    /** Riwayat semua transaksi, terbaru dulu. */
    public function index(): void
    {
        $pdo      = Database::pdo();
        $memberId = isset($_GET['member_id']) ? (int)$_GET['member_id'] : 0;
        $limit    = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
        if ($limit < 1 || $limit > 2000) $limit = 500;

        $sql = 'SELECT t.id, t.member_id, t.total_belanja, t.poin_dipakai, t.potongan,
                       t.total_bayar, t.poin_didapat, t.catatan, t.created_by, t.created_at,
                       m.name AS member_name, m.phone AS member_phone
                  FROM point_transactions t
                  JOIN members m ON m.id = t.member_id';
        $params = [];
        if ($memberId > 0) {
            $sql .= ' WHERE t.member_id = ?';
            $params[] = $memberId;
        }
        $sql .= ' ORDER BY t.created_at DESC, t.id DESC LIMIT ' . $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        Response::json(array_map([self::class, 'rapikanTransaksi'], $stmt->fetchAll(PDO::FETCH_ASSOC)));
    }

    /** Catat transaksi baru. */
    public function store(): void
    {
        $body        = Response::input();
        $memberId    = (int)($body['member_id'] ?? 0);
        $totalBelanja = (int)($body['total_belanja'] ?? 0);
        $poinDipakai = (int)($body['poin_dipakai'] ?? 0);
        $catatan     = trim((string)($body['catatan'] ?? ''));

        if ($memberId <= 0) Response::error('Pelanggan wajib dipilih', 422);

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            // Kunci baris pelanggan supaya dua kasir tidak bisa memakai saldo
            // poin yang sama secara bersamaan.
            $cek = $pdo->prepare('SELECT id, name FROM members WHERE id = ?' . Sql::forUpdate($pdo));
            $cek->execute([$memberId]);
            $member = $cek->fetch(PDO::FETCH_ASSOC);
            if (!$member) {
                $pdo->rollBack();
                Response::error('Pelanggan tidak ditemukan', 404);
            }

            $saldo = self::saldo($pdo, $memberId);

            try {
                $hitung = Points::hitung($totalBelanja, $poinDipakai, $saldo);
            } catch (\InvalidArgumentException $e) {
                $pdo->rollBack();
                Response::error($e->getMessage(), 422, ['code' => 'point_rule']);
            }

            $kasir = Auth::current();
            $ins = $pdo->prepare(
                'INSERT INTO point_transactions
                    (member_id, total_belanja, poin_dipakai, potongan, total_bayar, poin_didapat, catatan, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([
                $memberId,
                $totalBelanja,
                $poinDipakai,
                $hitung['potongan'],
                $hitung['total_bayar'],
                $hitung['poin_didapat'],
                $catatan === '' ? null : $catatan,
                $kasir !== null && isset($kasir['username']) ? $kasir['username'] : null,
            ]);
            $id = (int)$pdo->lastInsertId();
            $pdo->commit();
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }

        Response::json([
            'id'            => $id,
            'member_id'     => $memberId,
            'member_name'   => $member['name'],
            'total_belanja' => $totalBelanja,
            'poin_dipakai'  => $poinDipakai,
            'potongan'      => $hitung['potongan'],
            'total_bayar'   => $hitung['total_bayar'],
            'poin_didapat'  => $hitung['poin_didapat'],
            'saldo_akhir'   => $hitung['saldo_akhir'],
        ], 201);
    }

    /**
     * Hapus transaksi (mis. salah input). Saldo pelanggan ikut terkoreksi
     * dengan sendirinya karena saldo dihitung dari tabel ini.
     */
    public function destroy(array $params): void
    {
        $id  = (int)$params['id'];
        $pdo = Database::pdo();

        $cek = $pdo->prepare('SELECT member_id FROM point_transactions WHERE id = ?');
        $cek->execute([$id]);
        $memberId = $cek->fetchColumn();
        if ($memberId === false) Response::error('Transaksi tidak ditemukan', 404);

        $del = $pdo->prepare('DELETE FROM point_transactions WHERE id = ?');
        $del->execute([$id]);

        Response::json([
            'ok'          => true,
            'member_id'   => (int)$memberId,
            'saldo_akhir' => self::saldo($pdo, (int)$memberId),
        ]);
    }

    /** Saldo poin pelanggan = poin didapat - poin dipakai. */
    public static function saldo(PDO $pdo, int $memberId): int
    {
        $stmt = $pdo->prepare(
            'SELECT COALESCE(SUM(poin_didapat), 0) - COALESCE(SUM(poin_dipakai), 0)
               FROM point_transactions WHERE member_id = ?'
        );
        $stmt->execute([$memberId]);
        return (int)$stmt->fetchColumn();
    }
}
