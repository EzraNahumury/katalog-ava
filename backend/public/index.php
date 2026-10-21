<?php
declare(strict_types=1);

// Front controller — semua request masuk ke sini via .htaccess rewrite.
// Di Hostinger, path ini kira-kira: /home/u123456/public_html/api/index.php
// dan src/ ada di /home/u123456/backend-src/ (di luar public_html).

// Untuk development lokal: src ada di ../src relatif ke public.
$srcPath = getenv('KATALOG_SRC_PATH') ?: __DIR__ . '/../src';
require $srcPath . '/bootstrap.php';

use App\Core\Router;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Controllers\CategoryController;
use App\Controllers\UserController;
use App\Controllers\UploadController;
use App\Controllers\MemberController;
use App\Controllers\PointController;
use App\Controllers\PortalController;

$router = new Router();

// Public
$router->post('/auth/login',            [AuthController::class,     'login']);
$router->get ('/products',              [ProductController::class,  'index']);
$router->get ('/products/{id}',         [ProductController::class,  'show']);
$router->get ('/categories',            [CategoryController::class, 'index']);
$router->get ('/uploads/{file}',        [UploadController::class,   'serve']);

// Halaman pembeli (poin member) — tanpa login akun, dibatasi rate limit
$router->post('/portal/check',          [PortalController::class,   'check']);
$router->get ('/portal/me',             [PortalController::class,   'me']);   // token scope member

// Admin (butuh JWT)
$router->post  ('/products',              [ProductController::class,  'store'],  true);
$router->put   ('/products/{id}',         [ProductController::class,  'update'], true);
$router->delete('/products/{id}',         [ProductController::class,  'destroy'],true);
$router->post  ('/products/{id}/image',   [ProductController::class,  'upload'], true);
$router->post  ('/categories',            [CategoryController::class, 'store'],  true);
$router->delete('/categories/{id}',       [CategoryController::class, 'destroy'],true);

// Poin member (kasir/admin)
$router->get   ('/members',               [MemberController::class,   'index'],     true);
$router->get   ('/members/birthdays',     [MemberController::class,   'birthdays'], true);
$router->get   ('/members/{id}',          [MemberController::class,   'show'],      true);
$router->post  ('/members',               [MemberController::class,   'store'],     true);
$router->put   ('/members/{id}',          [MemberController::class,   'update'],    true);
$router->delete('/members/{id}',          [MemberController::class,   'destroy'],   true);

$router->get   ('/transactions',          [PointController::class,    'index'],     true);
$router->post  ('/transactions',          [PointController::class,    'store'],     true);
$router->delete('/transactions/{id}',     [PointController::class,    'destroy'],   true);

$router->get   ('/users',                 [UserController::class,     'index'],   true);
$router->post  ('/users',                 [UserController::class,     'store'],   true);
$router->delete('/users/{id}',            [UserController::class,     'destroy'], true);

$router->dispatch();
