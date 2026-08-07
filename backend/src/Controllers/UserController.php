<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Database;
use App\Core\Response;

final class UserController
{
    public function index(): void
    {
        $rows = Database::pdo()->query(
            'SELECT id, username, role, created_at FROM users ORDER BY id ASC'
        )->fetchAll();
        foreach ($rows as &$r) $r['id'] = (int)$r['id'];
        Response::json($rows);
    }

    public function store(): void
    {
        $data = Response::input();
        $username = trim((string)($data['username'] ?? ''));
        $password = (string)($data['password'] ?? '');

        if ($username === '' || $password === '') {
            Response::error('Username & password wajib', 422);
        }
        if (strlen($password) < 6) {
            Response::error('Password minimal 6 karakter', 422);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo  = Database::pdo();

        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")');
        try {
            $stmt->execute([$username, $hash]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Username sudah ada', 409);
            }
            throw $e;
        }

        Response::json([
            'id'       => (int)$pdo->lastInsertId(),
            'username' => $username,
            'role'     => 'admin',
        ], 201);
    }

    public function destroy(array $params): void
    {
        $id      = (int)$params['id'];
        $current = Auth::current();
        $meId    = (int)($current['sub'] ?? 0);

        if ($id === $meId) {
            Response::error('Tidak bisa menghapus akun sendiri', 400);
        }

        $pdo = Database::pdo();

        // Jangan biarkan admin terakhir terhapus
        $count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count <= 1) {
            Response::error('Minimal harus ada 1 akun admin', 400);
        }

        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::error('Akun tidak ditemukan', 404);

        Response::json(['ok' => true]);
    }
}
