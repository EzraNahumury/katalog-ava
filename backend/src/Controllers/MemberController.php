<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Phone;
use App\Core\Response;
use App\Core\Sql;
use PDO;

/**
 * Data pelanggan program poin. Semua endpoint di sini butuh login kasir/admin.
 *
 * Saldo poin tidak disimpan sebagai kolom — selalu dihitung dari tabel
 * point_transactions, supaya menghapus transaksi otomatis mengoreksi saldo.
 */
final class MemberController
{
    /** Potongan SELECT saldo + ringkasan transaksi per pelanggan. */
    private function selectDasar(): string
    {
        return 'SELECT m.id, m.name, m.phone, m.birthdate, m.address, m.created_at,
                       COALESCE(SUM(t.poin_didapat), 0) - COALESCE(SUM(t.poin_dipakai), 0) AS saldo_poin,
                       COALESCE(SUM(t.total_bayar), 0) AS total_belanja,
                       COUNT(t.id) AS jumlah_transaksi,
                       MAX(t.created_at) AS transaksi_terakhir
                  FROM members m
             LEFT JOIN point_transactions t ON t.member_id = m.id';
    }

    private function rapikan(array $row): array
    {
        $row['id']               = (int)$row['id'];
        $row['saldo_poin']       = (int)$row['saldo_poin'];
        $row['total_belanja']    = (int)$row['total_belanja'];
        $row['jumlah_transaksi'] = (int)$row['jumlah_transaksi'];
        $row['phone_display']    = Phone::display((string)$row['phone']);
        return $row;
    }

    public function index(): void
    {
        $q   = trim((string)($_GET['q'] ?? ''));
        $pdo = Database::pdo();

        $sql    = $this->selectDasar();
        $params = [];

        if ($q !== '') {
            // Cari pakai nama ATAU nomor. Nomor dicocokkan dalam bentuk yang
            // sudah dinormalkan, jadi "0812", "62812", dan "812" sama saja.
            $digits = preg_replace('/\D+/', '', $q);
            $sql .= ' WHERE m.name LIKE ?';
            $params[] = '%' . $q . '%';
            if ($digits !== '') {
                $sql .= ' OR m.phone LIKE ?';
                $params[] = '%' . ltrim($digits, '0') . '%';
            }
        }

        $sql .= ' GROUP BY m.id ORDER BY m.name ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $rows = array_map([$this, 'rapikan'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        Response::json($rows);
    }

    public function show(array $params): void
    {
        $id  = (int)$params['id'];
        $pdo = Database::pdo();

        $stmt = $pdo->prepare($this->selectDasar() . ' WHERE m.id = ? GROUP BY m.id');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) Response::error('Pelanggan tidak ditemukan', 404);

        $tx = $pdo->prepare(
            'SELECT id, total_belanja, poin_dipakai, potongan, total_bayar, poin_didapat,
                    catatan, created_by, created_at
               FROM point_transactions
              WHERE member_id = ?
           ORDER BY created_at DESC, id DESC'
        );
        $tx->execute([$id]);

        $hasil = $this->rapikan($row);
        $hasil['transactions'] = array_map(
            [PointController::class, 'rapikanTransaksi'],
            $tx->fetchAll(PDO::FETCH_ASSOC)
        );
        Response::json($hasil);
    }

    /** Pelanggan yang ulang tahun pada bulan tertentu (default: bulan ini). */
    public function birthdays(): void
    {
        $pdo   = Database::pdo();
        $bulan = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('n');
        if ($bulan < 1 || $bulan > 12) Response::error('Bulan tidak valid', 422);

        $monthExpr = Sql::monthOf($pdo, 'm.birthdate');
        $dayExpr   = Sql::dayOf($pdo, 'm.birthdate');

        $stmt = $pdo->prepare(
            $this->selectDasar() .
            " WHERE m.birthdate IS NOT NULL AND $monthExpr = ?
              GROUP BY m.id
              ORDER BY $dayExpr ASC, m.name ASC"
        );
        $stmt->execute([$bulan]);

        $rows = array_map(function (array $row) use ($pdo) {
            $hasil = $this->rapikan($row);
            $hasil['tanggal_ulang_tahun'] = $row['birthdate'] !== null
                ? (int)date('j', strtotime((string)$row['birthdate']))
                : null;
            return $hasil;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        Response::json(['month' => $bulan, 'members' => $rows]);
    }

    public function store(): void
    {
        $data = $this->validasi(Response::input());
        $pdo  = Database::pdo();

        $stmt = $pdo->prepare(
            'INSERT INTO members (name, phone, birthdate, address) VALUES (?, ?, ?, ?)'
        );
        try {
            $stmt->execute([$data['name'], $data['phone'], $data['birthdate'], $data['address']]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Nomor WhatsApp itu sudah terdaftar', 409, ['code' => 'phone_exists']);
            }
            throw $e;
        }

        $this->show(['id' => (string)$pdo->lastInsertId()]);
    }

    public function update(array $params): void
    {
        $id   = (int)$params['id'];
        $data = $this->validasi(Response::input());
        $pdo  = Database::pdo();

        $stmt = $pdo->prepare(
            'UPDATE members SET name = ?, phone = ?, birthdate = ?, address = ? WHERE id = ?'
        );
        try {
            $stmt->execute([$data['name'], $data['phone'], $data['birthdate'], $data['address'], $id]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Nomor WhatsApp itu sudah dipakai pelanggan lain', 409, ['code' => 'phone_exists']);
            }
            throw $e;
        }

        $cek = $pdo->prepare('SELECT id FROM members WHERE id = ?');
        $cek->execute([$id]);
        if (!$cek->fetchColumn()) Response::error('Pelanggan tidak ditemukan', 404);

        $this->show(['id' => (string)$id]);
    }

    public function destroy(array $params): void
    {
        $id  = (int)$params['id'];
        $pdo = Database::pdo();

        // Transaksi ikut terhapus (FK ON DELETE CASCADE), jadi riwayat poin
        // pelanggan ini tidak menyisakan baris yatim.
        $stmt = $pdo->prepare('DELETE FROM members WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::error('Pelanggan tidak ditemukan', 404);

        Response::json(['ok' => true]);
    }

    /** Validasi + normalisasi input pelanggan. */
    private function validasi(array $body): array
    {
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') Response::error('Nama pelanggan wajib diisi', 422);
        if (mb_strlen($name) > 120) Response::error('Nama terlalu panjang (maks 120 karakter)', 422);

        try {
            $phone = Phone::normalize((string)($body['phone'] ?? ''));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 422, ['code' => 'phone_invalid']);
        }

        $birthdate = trim((string)($body['birthdate'] ?? ''));
        if ($birthdate === '') {
            $birthdate = null;
        } else {
            $parts = explode('-', $birthdate);
            if (count($parts) !== 3
                || !checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0])
                || (int)$parts[0] < 1900) {
                Response::error('Tanggal lahir tidak valid (format YYYY-MM-DD)', 422);
            }
            if (strtotime($birthdate) > time()) {
                Response::error('Tanggal lahir tidak boleh di masa depan', 422);
            }
        }

        $address = trim((string)($body['address'] ?? ''));

        return [
            'name'      => $name,
            'phone'     => $phone,
            'birthdate' => $birthdate,
            'address'   => $address === '' ? null : $address,
        ];
    }
}
