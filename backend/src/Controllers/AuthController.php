<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Database;
use App\Core\Response;

final class AuthController
{
    public function login(): void
    {
        $body = Response::input();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || $password === '') {
            Response::error('Username & password wajib diisi', 422);
        }

        $stmt = Database::pdo()->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Kredensial salah', 401);
        }

        $token = Auth::issue([
            'sub'      => (int)$user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ]);

        Response::json([
            'token' => $token,
            'user'  => [
                'id'       => (int)$user['id'],
                'username' => $user['username'],
                'role'     => $user['role'],
            ],
        ]);
    }
}
