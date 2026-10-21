<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Database;
use App\Core\Phone;
use App\Core\Response;
use App\Core\Sql;
use PDO;

/**
 * Halaman pembeli: cek poin sendiri tanpa punya akun.
 *
 * Pembeli cukup memasukkan nomor WhatsApp-nya (sesuai permintaan pemilik
 * toko — tanpa OTP). Pengamanannya:
 *   - percobaan gagal dibatasi per nomor dan per alamat IP, jadi nomor tidak
 *     bisa ditebak borongan;
 *   - balasan untuk "nomor tidak terdaftar" dibuat sama persis dengan
 *     "tanggal lahir salah", supaya tidak bisa dipakai memetakan nomor;
 *   - yang dikirim ke pembeli hanya nama, saldo poin, dan riwayat belanja —
 *     alamat dan tanggal lahir tidak pernah ikut;
 *   - sesudah lolos, pembeli memegang token pendek (30 menit) ber-scope
 *     "member" yang tidak berlaku di endpoint admin.
 *
 * Kalau suatu saat ingin lebih ketat tanpa biaya OTP, set
 * 'portal_require_birthdate' => true di config.php: pembeli harus memasukkan
 * tanggal lahir yang cocok.
 */
final class PortalController
{
    /** Umur token pembeli (detik). */
    const TOKEN_TTL = 1800;

    /** Jendela waktu penghitungan percobaan (menit). */
    const WINDOW_MENIT = 15;

    /** Batas percobaan gagal dalam satu jendela. */
    const MAKS_GAGAL_PER_NOMOR = 8;
    const MAKS_GAGAL_PER_IP    = 30;

    public function check(): void
    {
        $body = Response::input();
        $pdo  = Database::pdo();
        $ip   = $this->ip();

        try {
            $phone = Phone::normalize((string)($body['phone'] ?? ''));
        } catch (\InvalidArgumentException $e) {
            // Tidak dicatat sebagai percobaan: ini salah ketik, bukan tebakan.
            Response::error($e->getMessage(), 422, ['code' => 'phone_invalid']);
        }

        $this->cekBatas($pdo, $ip, $phone);

        $stmt = $pdo->prepare('SELECT id, name, phone, birthdate FROM members WHERE phone = ?');
        $stmt->execute([$phone]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        $wajibUltah = !empty(APP_CONFIG['portal_require_birthdate']);
        $cocok      = $member !== false;

        if ($cocok && $wajibUltah) {
            $input = trim((string)($body['birthdate'] ?? ''));
            $cocok = $input !== '' && $member['birthdate'] !== null
                && substr((string)$member['birthdate'], 0, 10) === $input;
        }

        $this->catatPercobaan($pdo, $ip, $phone, $cocok);

        if (!$cocok) {
            // Pesan sengaja seragam supaya tidak membocorkan nomor mana yang terdaftar.
            Response::error(
                $wajibUltah
                    ? 'Nomor WhatsApp atau tanggal lahir tidak cocok.'
                    : 'Nomor WhatsApp ini belum terdaftar sebagai member.',
                404,
                ['code' => 'not_found']
            );
        }

        $memberId = (int)$member['id'];
        Response::json([
            'token'  => Auth::issue([
                'scope' => 'member',
                'mid'   => $memberId,
            ], self::TOKEN_TTL),
            'member' => [
                'name'       => $member['name'],
                'saldo_poin' => PointController::saldo($pdo, $memberId),
            ],
        ]);
    }

    /** Data pembeli yang sedang login lewat token portal. */
    public function me(): void
    {
        $payload  = Auth::requireAuth('member');
        $memberId = (int)($payload['mid'] ?? 0);
        if ($memberId <= 0) Response::error('Token portal tidak valid', 401, ['code' => 'invalid_token']);

        $pdo  = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, name FROM members WHERE id = ?');
        $stmt->execute([$memberId]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$member) Response::error('Data member tidak ditemukan', 404);

        // Sengaja tidak mengambil alamat & tanggal lahir.
        $tx = $pdo->prepare(
            'SELECT total_belanja, poin_dipakai, potongan, total_bayar, poin_didapat, created_at
               FROM point_transactions
              WHERE member_id = ?
           ORDER BY created_at DESC, id DESC
              LIMIT 100'
        );
        $tx->execute([$memberId]);

        $riwayat = array_map(function (array $r) {
            return [
                'total_belanja' => (int)$r['total_belanja'],
                'poin_dipakai'  => (int)$r['poin_dipakai'],
                'potongan'      => (int)$r['potongan'],
                'total_bayar'   => (int)$r['total_bayar'],
                'poin_didapat'  => (int)$r['poin_didapat'],
                'created_at'    => $r['created_at'],
            ];
        }, $tx->fetchAll(PDO::FETCH_ASSOC));

        Response::json([
            'member' => [
                'name'       => $member['name'],
                'saldo_poin' => PointController::saldo($pdo, $memberId),
            ],
            'transactions' => $riwayat,
        ]);
    }

    /** Tolak kalau percobaan gagal sudah terlalu banyak. */
    private function cekBatas(PDO $pdo, string $ip, string $phone): void
    {
        $sejak = Sql::minutesAgo($pdo, self::WINDOW_MENIT);

        $perNomor = $pdo->prepare(
            "SELECT COUNT(*) FROM portal_attempts
              WHERE phone = ? AND success = 0 AND created_at > $sejak"
        );
        $perNomor->execute([$phone]);
        if ((int)$perNomor->fetchColumn() >= self::MAKS_GAGAL_PER_NOMOR) {
            Response::error(
                'Terlalu banyak percobaan untuk nomor ini. Coba lagi sekitar ' . self::WINDOW_MENIT . ' menit.',
                429,
                ['code' => 'rate_limited', 'retry_after_menit' => self::WINDOW_MENIT]
            );
        }

        $perIp = $pdo->prepare(
            "SELECT COUNT(*) FROM portal_attempts
              WHERE ip = ? AND success = 0 AND created_at > $sejak"
        );
        $perIp->execute([$ip]);
        if ((int)$perIp->fetchColumn() >= self::MAKS_GAGAL_PER_IP) {
            Response::error(
                'Terlalu banyak percobaan dari perangkat ini. Coba lagi sekitar ' . self::WINDOW_MENIT . ' menit.',
                429,
                ['code' => 'rate_limited', 'retry_after_menit' => self::WINDOW_MENIT]
            );
        }
    }

    private function catatPercobaan(PDO $pdo, string $ip, string $phone, bool $sukses): void
    {
        $stmt = $pdo->prepare('INSERT INTO portal_attempts (ip, phone, success) VALUES (?, ?, ?)');
        $stmt->execute([$ip, $phone, $sukses ? 1 : 0]);
    }

    private function ip(): string
    {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '0.0.0.0';
        return substr($ip, 0, 45);
    }
}
