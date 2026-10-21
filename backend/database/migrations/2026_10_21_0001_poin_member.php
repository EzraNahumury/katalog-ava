<?php
/**
 * Tabel untuk fitur Poin Member Avasport.
 *
 *  - members            : data pelanggan (nomor WA unik)
 *  - point_transactions : buku besar transaksi. Saldo poin SELALU dihitung
 *                         dari tabel ini (SUM poin_didapat - SUM poin_dipakai),
 *                         tidak disimpan sebagai kolom, supaya menghapus
 *                         transaksi otomatis mengoreksi saldo.
 *  - portal_attempts    : catatan percobaan cek poin di halaman pembeli,
 *                         dipakai untuk membatasi tebak-tebakan nomor.
 */

return [
    'deskripsi' => 'Tabel poin member: members, point_transactions, portal_attempts',

    'jalan' => function (PDO $pdo, callable $log, $dryRun) {
        $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

        $ddl = $sqlite
            ? [
                'members' => 'CREATE TABLE IF NOT EXISTS members (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    name       TEXT NOT NULL,
                    phone      TEXT NOT NULL UNIQUE,
                    birthdate  TEXT NULL,
                    address    TEXT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )',
                'point_transactions' => 'CREATE TABLE IF NOT EXISTS point_transactions (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    member_id     INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
                    total_belanja INTEGER NOT NULL,
                    poin_dipakai  INTEGER NOT NULL DEFAULT 0,
                    potongan      INTEGER NOT NULL DEFAULT 0,
                    total_bayar   INTEGER NOT NULL,
                    poin_didapat  INTEGER NOT NULL DEFAULT 0,
                    catatan       TEXT NULL,
                    created_by    TEXT NULL,
                    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
                )',
                'portal_attempts' => 'CREATE TABLE IF NOT EXISTS portal_attempts (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip         TEXT NOT NULL,
                    phone      TEXT NOT NULL,
                    success    INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )',
            ]
            : [
                'members' => 'CREATE TABLE IF NOT EXISTS `members` (
                    `id`         INT AUTO_INCREMENT PRIMARY KEY,
                    `name`       VARCHAR(120) NOT NULL,
                    `phone`      VARCHAR(20) NOT NULL,
                    `birthdate`  DATE NULL,
                    `address`    TEXT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_members_phone` (`phone`),
                    KEY `idx_members_name` (`name`),
                    KEY `idx_members_birthdate` (`birthdate`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
                'point_transactions' => 'CREATE TABLE IF NOT EXISTS `point_transactions` (
                    `id`            INT AUTO_INCREMENT PRIMARY KEY,
                    `member_id`     INT NOT NULL,
                    `total_belanja` INT NOT NULL,
                    `poin_dipakai`  INT NOT NULL DEFAULT 0,
                    `potongan`      INT NOT NULL DEFAULT 0,
                    `total_bayar`   INT NOT NULL,
                    `poin_didapat`  INT NOT NULL DEFAULT 0,
                    `catatan`       VARCHAR(255) NULL,
                    `created_by`    VARCHAR(60) NULL,
                    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    KEY `idx_tx_member` (`member_id`),
                    KEY `idx_tx_created` (`created_at`),
                    CONSTRAINT `fk_tx_member` FOREIGN KEY (`member_id`)
                        REFERENCES `members` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
                'portal_attempts' => 'CREATE TABLE IF NOT EXISTS `portal_attempts` (
                    `id`         INT AUTO_INCREMENT PRIMARY KEY,
                    `ip`         VARCHAR(45) NOT NULL,
                    `phone`      VARCHAR(20) NOT NULL,
                    `success`    TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    KEY `idx_attempt_ip` (`ip`, `created_at`),
                    KEY `idx_attempt_phone` (`phone`, `created_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            ];

        foreach ($ddl as $tabel => $sql) {
            if ($dryRun) {
                $log("(simulasi) tabel $tabel akan dibuat kalau belum ada");
                continue;
            }
            $pdo->exec($sql);
            $log("tabel $tabel siap");
        }
    },
];
