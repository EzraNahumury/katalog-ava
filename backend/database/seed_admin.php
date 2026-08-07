<?php
/**
 * Buat / reset user admin.
 *
 * Cara pakai:
 *   php backend/database/seed_admin.php <username> <password>
 *
 * Contoh:
 *   php backend/database/seed_admin.php admin RahasiaBanget123
 *
 * Jalankan sekali saat setup awal. Boleh dijalankan lagi untuk reset password.
 */
declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';
use App\Core\Database;

if ($argc < 3) {
    fwrite(STDERR, "Usage: php seed_admin.php <username> <password>\n");
    exit(1);
}

[$_, $username, $password] = $argv;
$hash = password_hash($password, PASSWORD_BCRYPT);

$pdo = Database::pdo();
$stmt = $pdo->prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
);
$stmt->execute([$username, $hash]);

echo "Admin user '$username' created/updated.\n";
