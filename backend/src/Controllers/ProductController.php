<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;

final class ProductController
{
    public function index(): void
    {
        $pdo = Database::pdo();

        $products = $pdo->query(
            "SELECT p.id, p.name, p.variants, p.bandrol, p.harga_jual,
                    p.image, p.sort_order, c.name AS category
               FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
           ORDER BY p.sort_order ASC, p.id ASC"
        )->fetchAll();

        if (!$products) {
            Response::json([]);
        }

        // Bulk-fetch tiers
        $ids = array_column($products, 'id');
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT product_id, moq, harga_grosir FROM price_tiers
                                WHERE product_id IN ($in)
                             ORDER BY moq ASC");
        $stmt->execute($ids);

        $tiersByPid = [];
        foreach ($stmt->fetchAll() as $t) {
            $tiersByPid[(int)$t['product_id']][] = [
                'moq'          => (int)$t['moq'],
                'harga_grosir' => (int)$t['harga_grosir'],
            ];
        }

        $urlBase = rtrim(APP_CONFIG['upload_url_base'] ?? '', '/');
        foreach ($products as &$p) {
            $p['id']         = (int)$p['id'];
            $p['bandrol']    = $p['bandrol']    !== null ? (int)$p['bandrol']    : null;
            $p['harga_jual'] = $p['harga_jual'] !== null ? (int)$p['harga_jual'] : null;
            $p['image']      = $p['image']      ? "$urlBase/{$p['image']}" : null;
            $p['tiers']      = $tiersByPid[$p['id']] ?? [];
            unset($p['sort_order']);
        }

        Response::json($products);
    }

    public function show(array $params): void
    {
        $id  = (int)$params['id'];
        $pdo = Database::pdo();

        $stmt = $pdo->prepare(
            "SELECT p.id, p.name, p.variants, p.bandrol, p.harga_jual,
                    p.image, c.name AS category
               FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
              WHERE p.id = ? LIMIT 1"
        );
        $stmt->execute([$id]);
        $p = $stmt->fetch();
        if (!$p) Response::error('Produk tidak ditemukan', 404);

        $tStmt = $pdo->prepare('SELECT moq, harga_grosir FROM price_tiers WHERE product_id = ? ORDER BY moq ASC');
        $tStmt->execute([$id]);

        $urlBase = rtrim(APP_CONFIG['upload_url_base'] ?? '', '/');
        $p['id']         = (int)$p['id'];
        $p['bandrol']    = $p['bandrol']    !== null ? (int)$p['bandrol']    : null;
        $p['harga_jual'] = $p['harga_jual'] !== null ? (int)$p['harga_jual'] : null;
        $p['image']      = $p['image']      ? "$urlBase/{$p['image']}" : null;
        $p['tiers']      = array_map(
            fn($t) => ['moq' => (int)$t['moq'], 'harga_grosir' => (int)$t['harga_grosir']],
            $tStmt->fetchAll()
        );

        Response::json($p);
    }

    public function store(): void
    {
        $data = Response::input();
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') Response::error('Nama produk wajib', 422);

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO products (category_id, name, variants, bandrol, harga_jual, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $this->resolveCategoryId($data['category'] ?? null),
                $name,
                $data['variants']   ?? null,
                $this->intOrNull($data['bandrol']    ?? null),
                $this->intOrNull($data['harga_jual'] ?? null),
                (int)($data['sort_order'] ?? 0),
            ]);
            $id = (int)$pdo->lastInsertId();
            $this->syncTiers($id, $data['tiers'] ?? []);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $this->show(['id' => (string)$id]);
    }

    public function update(array $params): void
    {
        $id   = (int)$params['id'];
        $data = Response::input();

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'UPDATE products SET category_id=?, name=?, variants=?, bandrol=?, harga_jual=?, sort_order=?
                  WHERE id=?'
            );
            $stmt->execute([
                $this->resolveCategoryId($data['category'] ?? null),
                trim((string)($data['name'] ?? '')),
                $data['variants']   ?? null,
                $this->intOrNull($data['bandrol']    ?? null),
                $this->intOrNull($data['harga_jual'] ?? null),
                (int)($data['sort_order'] ?? 0),
                $id,
            ]);
            if (array_key_exists('tiers', $data)) {
                $this->syncTiers($id, $data['tiers'] ?? []);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $this->show(['id' => (string)$id]);
    }

    public function destroy(array $params): void
    {
        $id = (int)$params['id'];
        $pdo = Database::pdo();

        // Hapus file gambar kalau ada (opsional — abaikan error)
        $stmt = $pdo->prepare('SELECT image FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $image = $stmt->fetchColumn();
        if ($image) {
            $path = rtrim(APP_CONFIG['upload_dir'], '/\\') . '/' . $image;
            if (is_file($path)) @unlink($path);
        }

        $del = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $del->execute([$id]);
        if ($del->rowCount() === 0) Response::error('Produk tidak ditemukan', 404);
        Response::json(['ok' => true]);
    }

    public function upload(array $params): void
    {
        $id = (int)$params['id'];
        if (!isset($_FILES['image'])) Response::error('Field "image" tidak ada', 422);

        $file = $_FILES['image'];
        if ($file['error'] !== UPLOAD_ERR_OK) Response::error('Upload error code ' . $file['error'], 400);
        if ($file['size'] > (APP_CONFIG['upload_max_size'] ?? PHP_INT_MAX)) {
            Response::error('Ukuran file melebihi batas', 413);
        }

        $mime = mime_content_type($file['tmp_name']) ?: '';
        $allowed = APP_CONFIG['upload_allowed_mime'] ?? [];
        if ($allowed && !in_array($mime, $allowed, true)) {
            Response::error('Tipe file tidak diizinkan: ' . $mime, 415);
        }

        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'bin',
        };

        $dir = rtrim(APP_CONFIG['upload_dir'], '/\\');
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $fname = 'p' . $id . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest  = "$dir/$fname";
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Gagal menyimpan file', 500);
        }

        $pdo = Database::pdo();
        // Hapus gambar lama
        $old = $pdo->prepare('SELECT image FROM products WHERE id = ?');
        $old->execute([$id]);
        $prev = $old->fetchColumn();
        if ($prev && is_file("$dir/$prev")) @unlink("$dir/$prev");

        $up = $pdo->prepare('UPDATE products SET image = ? WHERE id = ?');
        $up->execute([$fname, $id]);

        $urlBase = rtrim(APP_CONFIG['upload_url_base'] ?? '', '/');
        Response::json(['image' => "$urlBase/$fname"]);
    }

    // ---------- helpers ----------

    private function intOrNull(mixed $v): ?int
    {
        if ($v === null || $v === '') return null;
        return (int)$v;
    }

    /** Terima nama kategori (string) atau id (int). Auto-create kalau nama baru. */
    private function resolveCategoryId(mixed $val): ?int
    {
        if ($val === null || $val === '') return null;
        if (is_numeric($val)) return (int)$val;

        $name = trim((string)$val);
        $pdo  = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? LIMIT 1');
        $stmt->execute([$name]);
        $id = $stmt->fetchColumn();
        if ($id) return (int)$id;

        $ins = $pdo->prepare('INSERT INTO categories (name) VALUES (?)');
        $ins->execute([$name]);
        return (int)$pdo->lastInsertId();
    }

    /** Ganti seluruh tier untuk produk ini dengan yang baru. */
    private function syncTiers(int $productId, array $tiers): void
    {
        $pdo = Database::pdo();
        $pdo->prepare('DELETE FROM price_tiers WHERE product_id = ?')->execute([$productId]);
        if (!$tiers) return;

        $ins = $pdo->prepare('INSERT INTO price_tiers (product_id, moq, harga_grosir, sort_order) VALUES (?, ?, ?, ?)');
        $sort = 0;
        foreach ($tiers as $t) {
            $moq   = $this->intOrNull($t['moq']          ?? null);
            $price = $this->intOrNull($t['harga_grosir'] ?? null);
            if ($moq === null || $price === null) continue;
            $ins->execute([$productId, $moq, $price, $sort++]);
        }
    }
}
