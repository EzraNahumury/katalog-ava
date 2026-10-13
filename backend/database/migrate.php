<?php
/**
 * Runner migration sederhana untuk Katalog Ava.
 *
 * Setiap file di backend/database/migrations/*.php mengembalikan array:
 *   return [
 *     'deskripsi' => 'penjelasan singkat',
 *     'jalan'     => function (PDO $pdo, callable $log, bool $dryRun) { ... },
 *   ];
 *
 * Migration yang sudah dijalankan dicatat di tabel `migrations`, jadi aman
 * dijalankan berkali-kali: yang sudah tercatat dilewati.
 *
 * Cara pakai (dari root repo di server):
 *   php backend/database/migrate.php --status    # lihat yang sudah/belum jalan
 *   php backend/database/migrate.php --dry-run   # simulasi, tidak menulis apa pun
 *   php backend/database/migrate.php             # jalankan yang belum
 *
 * Hanya bisa dijalankan dari CLI — tidak bisa dipanggil lewat HTTP.
 */

if (PHP_SAPI !== 'cli' && !defined('KATALOG_MIGRATE_TEST')) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "migrate.php hanya bisa dijalankan dari command line.\n";
    exit(1);
}

/** Buat tabel pencatat migration kalau belum ada. */
function katalog_migrate_ensure_table(PDO $pdo)
{
    // Cabang sqlite dipakai oleh tes lokal (tanpa MySQL); produksi selalu MySQL.
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS migrations (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL UNIQUE,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )'
        );
        return;
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `migrations` (
            `id`         INT AUTO_INCREMENT PRIMARY KEY,
            `name`       VARCHAR(255) NOT NULL,
            `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uq_migrations_name` (`name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

/** Nama migration yang sudah pernah dijalankan. */
function katalog_migrate_applied(PDO $pdo)
{
    $rows = $pdo->query('SELECT name FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
    return $rows ? array_values($rows) : [];
}

/** Semua file migration, urut berdasarkan nama file. */
function katalog_migrate_files($dir)
{
    $files = glob(rtrim($dir, '/\\') . '/*.php');
    if (!$files) return [];
    sort($files, SORT_STRING);
    return $files;
}

/**
 * Jalankan migration yang belum tercatat.
 * Return kode exit: 0 sukses, 1 ada yang gagal.
 */
function katalog_migrate_run(PDO $pdo, $dir, array $opts = [])
{
    $dryRun = !empty($opts['dry-run']);
    $status = !empty($opts['status']);
    $log    = isset($opts['log']) ? $opts['log'] : function ($line) { echo $line . PHP_EOL; };

    katalog_migrate_ensure_table($pdo);
    $applied = katalog_migrate_applied($pdo);
    $files   = katalog_migrate_files($dir);

    if (!$files) {
        $log('Tidak ada file migration di ' . $dir);
        return 0;
    }

    if ($status) {
        $log('Status migration:');
        foreach ($files as $file) {
            $name = basename($file, '.php');
            $def  = require $file;
            $mark = in_array($name, $applied, true) ? '[sudah]' : '[belum]';
            $log("  $mark $name — " . (isset($def['deskripsi']) ? $def['deskripsi'] : '-'));
        }
        return 0;
    }

    $pending = 0;
    $failed  = 0;

    foreach ($files as $file) {
        $name = basename($file, '.php');
        if (in_array($name, $applied, true)) continue;

        $def = require $file;
        if (!isset($def['jalan']) || !is_callable($def['jalan'])) {
            $log("GAGAL $name — file tidak mengembalikan 'jalan' yang bisa dipanggil");
            $failed++;
            continue;
        }

        $pending++;
        $log(($dryRun ? 'SIMULASI ' : 'JALAN ') . $name . ' — ' . (isset($def['deskripsi']) ? $def['deskripsi'] : '-'));

        $inTransaction = false;
        try {
            if (!$dryRun) {
                $pdo->beginTransaction();
                $inTransaction = true;
            }

            call_user_func($def['jalan'], $pdo, function ($line) use ($log) { $log('   ' . $line); }, $dryRun);

            if (!$dryRun) {
                $ins = $pdo->prepare('INSERT INTO migrations (name) VALUES (?)');
                $ins->execute([$name]);
                $pdo->commit();
                $inTransaction = false;
                $log('   selesai & dicatat');
            } else {
                $log('   (simulasi — tidak ada yang ditulis)');
            }
        } catch (Throwable $e) {
            if ($inTransaction) $pdo->rollBack();
            $log('   GAGAL: ' . $e->getMessage());
            $failed++;
        }
    }

    if ($pending === 0) $log('Semua migration sudah pernah dijalankan.');
    return $failed > 0 ? 1 : 0;
}

// --- Entry point CLI (dilewati saat file di-include oleh tes) ---
if (!defined('KATALOG_MIGRATE_TEST')) {
    require __DIR__ . '/../src/bootstrap.php';

    $opts = [
        'dry-run' => in_array('--dry-run', $argv, true),
        'status'  => in_array('--status', $argv, true),
    ];

    exit(katalog_migrate_run(
        \App\Core\Database::pdo(),
        __DIR__ . '/migrations',
        $opts
    ));
}
