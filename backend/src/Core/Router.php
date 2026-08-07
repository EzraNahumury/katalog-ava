<?php
declare(strict_types=1);

namespace App\Core;

final class Router
{
    /** @var array<int, array{method:string, pattern:string, handler:callable|array, auth:bool}> */
    private array $routes = [];

    public function get(string $path, callable|array $handler, bool $auth = false): void    { $this->add('GET', $path, $handler, $auth); }
    public function post(string $path, callable|array $handler, bool $auth = false): void   { $this->add('POST', $path, $handler, $auth); }
    public function put(string $path, callable|array $handler, bool $auth = false): void    { $this->add('PUT', $path, $handler, $auth); }
    public function delete(string $path, callable|array $handler, bool $auth = false): void { $this->add('DELETE', $path, $handler, $auth); }

    private function add(string $method, string $path, callable|array $handler, bool $auth): void
    {
        // Ubah "/products/{id}" → regex "#^/products/(?P<id>[^/]+)$#"
        $pattern = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $path);
        $pattern = "#^" . $pattern . "$#";
        $this->routes[] = compact('method', 'pattern', 'handler', 'auth');
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

        // Strip base path kalau API di-mount di subfolder (mis. /api/products)
        // Untuk deployment di subdomain api.katalogava.com, base = ''
        $base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }
        if ($uri === '' || $uri === false) $uri = '/';

        foreach ($this->routes as $r) {
            if ($r['method'] !== $method) continue;
            if (preg_match($r['pattern'], $uri, $matches)) {
                if ($r['auth']) {
                    Auth::requireAuth();
                }
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $handler = $r['handler'];
                if (is_array($handler)) {
                    [$class, $action] = $handler;
                    (new $class())->$action($params);
                } else {
                    $handler($params);
                }
                return;
            }
        }

        Response::error('Not found: ' . $method . ' ' . $uri, 404);
    }
}
