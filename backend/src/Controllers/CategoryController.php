<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;

final class CategoryController
{
    public function index(): void
    {
        $rows = Database::pdo()->query(
            'SELECT c.id, c.name, COUNT(p.id) AS product_count
               FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
           GROUP BY c.id
           ORDER BY c.name ASC'
        )->fetchAll();

        // Cast supaya JSON keluar sebagai number
        foreach ($rows as &$r) {
            $r['id']            = (int)$r['id'];
            $r['product_count'] = (int)$r['product_count'];
        }
        Response::json($rows);
    }

    public function store(): void
    {
        $name = trim((string)(Response::input()['name'] ?? ''));
        if ($name === '') Response::error('Nama kategori wajib', 422);

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('INSERT INTO categories (name) VALUES (?)');
        try {
            $stmt->execute([$name]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') { // duplicate
                Response::error('Kategori sudah ada', 409);
            }
            throw $e;
        }
        Response::json(['id' => (int)$pdo->lastInsertId(), 'name' => $name], 201);
    }

    public function destroy(array $params): void
    {
        $id = (int)$params['id'];
        $stmt = Database::pdo()->prepare('DELETE FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::error('Kategori tidak ditemukan', 404);
        Response::json(['ok' => true]);
    }
}
