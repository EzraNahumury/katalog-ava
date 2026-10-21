-- Katalog Ava — schema MySQL
-- Import via phpMyAdmin di Hostinger, atau: mysql -u USER -p DB_NAME < schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table: categories
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(80) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: products
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT DEFAULT NULL,
  `name`        VARCHAR(200) NOT NULL,
  `variants`    TEXT DEFAULT NULL,
  `bandrol`     INT DEFAULT NULL,
  `harga_jual`  INT DEFAULT NULL,
  `image`       VARCHAR(255) DEFAULT NULL,
  `sort_order`  INT DEFAULT 0,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: price_tiers  (harga grosir bertingkat berdasarkan MOQ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `price_tiers` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `product_id`   INT NOT NULL,
  `moq`          INT NOT NULL,
  `harga_grosir` INT NOT NULL,
  `sort_order`   INT DEFAULT 0,
  KEY `idx_tiers_product` (`product_id`),
  CONSTRAINT `fk_tiers_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: users  (admin login)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(60) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin') DEFAULT 'admin',
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- POIN MEMBER
-- Dibuat juga oleh migration 2026_10_21_0001_poin_member.php.
-- Saldo poin TIDAK disimpan sebagai kolom: selalu dihitung dari
-- point_transactions (SUM poin_didapat - SUM poin_dipakai), supaya
-- menghapus transaksi otomatis mengoreksi saldo.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `members` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(120) NOT NULL,
  `phone`      VARCHAR(20) NOT NULL,          -- selalu bentuk 628xxxxxxxxx
  `birthdate`  DATE NULL,
  `address`    TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_members_phone` (`phone`),
  KEY `idx_members_name` (`name`),
  KEY `idx_members_birthdate` (`birthdate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_transactions` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `member_id`     INT NOT NULL,
  `total_belanja` INT NOT NULL,          -- sebelum potongan
  `poin_dipakai`  INT NOT NULL DEFAULT 0,
  `potongan`      INT NOT NULL DEFAULT 0,
  `total_bayar`   INT NOT NULL,          -- total_belanja - potongan
  `poin_didapat`  INT NOT NULL DEFAULT 0,
  `catatan`       VARCHAR(255) NULL,
  `created_by`    VARCHAR(60) NULL,      -- username kasir
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_tx_member` (`member_id`),
  KEY `idx_tx_created` (`created_at`),
  CONSTRAINT `fk_tx_member` FOREIGN KEY (`member_id`)
    REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_attempts` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `ip`         VARCHAR(45) NOT NULL,
  `phone`      VARCHAR(20) NOT NULL,
  `success`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_attempt_ip` (`ip`, `created_at`),
  KEY `idx_attempt_phone` (`phone`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
