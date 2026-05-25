<?php

declare(strict_types=1);

/**
 * LamboPHP
 * A minimal, functional HTTP toolkit.
 */

// -----------------------------------------------------------------------------
// HTTP
// -----------------------------------------------------------------------------

/**
 * Build an array-based request from PHP superglobals.
 *
 * @return array<string, mixed>
 */
function request(): array
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';

    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (str_starts_with($key, 'HTTP_')) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$name] = $value;
        }
    }

    $rawBody = file_get_contents('php://input') ?: '';

    return [
        'method' => $method,
        'uri' => $uri,
        'path' => $path,
        'query' => $_GET,
        'params' => [],
        'headers' => $headers,
        'body' => $rawBody,
        'parsed_body' => $_POST,
    ];
}

/**
 * Build a response array.
 *
 * @param array<string, string> $headers
 * @return array{status:int,headers:array<string,string>,body:string}
 */
function response(string $body, int $status = 200, array $headers = []): array
{
    return [
        'status' => $status,
        'headers' => $headers,
        'body' => $body,
    ];
}

/**
 * Send a response built by response().
 *
 * @param array{status:int,headers:array<string,string>,body:string} $response
 */
function send(array $response): void
{
    http_response_code($response['status']);

    foreach ($response['headers'] as $name => $value) {
        header("{$name}: {$value}");
    }

    echo $response['body'];
}

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------

/**
 * @param callable(array<string,mixed>):array{status:int,headers:array<string,string>,body:string} $handler
 * @return array{0:string,1:string,2:callable}
 */
function get(string $path, callable $handler): array
{
    return ['GET', $path, $handler];
}

/**
 * @param callable(array<string,mixed>):array{status:int,headers:array<string,string>,body:string} $handler
 * @return array{0:string,1:string,2:callable}
 */
function post(string $path, callable $handler): array
{
    return ['POST', $path, $handler];
}

/**
 * Match request against routes and return [handler, params].
 *
 * Supports literal segments and named parameters like /users/{id}.
 *
 * @param array<int,array{0:string,1:string,2:callable}> $routes
 * @param array<string,mixed> $request
 * @return array{0:callable,1:array<string,string>}|null
 */
function match_route(array $routes, array $request): ?array
{
    $method = strtoupper((string) ($request['method'] ?? 'GET'));
    $path = (string) ($request['path'] ?? '/');

    foreach ($routes as [$routeMethod, $routePath, $handler]) {
        if ($method !== $routeMethod) {
            continue;
        }

        $params = match_path($routePath, $path);
        if ($params !== null) {
            return [$handler, $params];
        }
    }

    return null;
}

/**
 * Match route pattern against request path.
 *
 * @return array<string,string>|null
 */
function match_path(string $pattern, string $path): ?array
{
    $patternSegments = array_values(array_filter(explode('/', trim($pattern, '/')), 'strlen'));
    $pathSegments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));

    // Special-case root path.
    if ($pattern === '/' && $path === '/') {
        return [];
    }

    if (count($patternSegments) !== count($pathSegments)) {
        return null;
    }

    $params = [];

    foreach ($patternSegments as $index => $segment) {
        $value = $pathSegments[$index];

        if (preg_match('/^{([a-zA-Z_][a-zA-Z0-9_]*)}$/', $segment, $matches) === 1) {
            $params[$matches[1]] = $value;
            continue;
        }

        if ($segment !== $value) {
            return null;
        }
    }

    return $params;
}

/**
 * Route-dispatch middleware.
 *
 * @param array<int,array{0:string,1:string,2:callable}> $routes
 * @return callable(callable):callable
 */
function with_routes(array $routes): callable
{
    return function (callable $next) use ($routes): callable {
        return function (array $request) use ($routes, $next): array {
            $match = match_route($routes, $request);

            if ($match === null) {
                return $next($request);
            }

            [$handler, $params] = $match;
            $request['params'] = $params;

            return $handler($request);
        };
    };
}

// -----------------------------------------------------------------------------
// Pipeline
// -----------------------------------------------------------------------------

/**
 * Compose middlewares into a request handler.
 *
 * Middlewares are of shape: fn(callable $next): callable
 * Handler is of shape: fn(array $request): array $response
 */
function pipe(callable ...$middlewares): callable
{
    $finalHandler = fn(array $request): array => response('Not Found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);

    return array_reduce(
        array_reverse($middlewares),
        fn(callable $next, callable $middleware): callable => $middleware($next),
        $finalHandler
    );
}

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

/**
 * Example middleware factory for request/response transforms.
 *
 * @param callable(array<string,mixed>):array<string,mixed> $transformRequest
 * @param callable(array{status:int,headers:array<string,string>,body:string}):array{status:int,headers:array<string,string>,body:string} $transformResponse
 * @return callable(callable):callable
 */
function middleware(callable $transformRequest, callable $transformResponse): callable
{
    return function (callable $next) use ($transformRequest, $transformResponse): callable {
        return function (array $request) use ($next, $transformRequest, $transformResponse): array {
            $request = $transformRequest($request);
            $response = $next($request);

            return $transformResponse($response);
        };
    };
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Create a JSON response.
 *
 * @param mixed $data
 * @param array<string,string> $headers
 * @return array{status:int,headers:array<string,string>,body:string}
 */
function json(mixed $data, int $status = 200, array $headers = []): array
{
    $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($body === false) {
        return response(
            '{"error":"Failed to encode JSON"}',
            500,
            ['Content-Type' => 'application/json; charset=utf-8']
        );
    }

    return response(
        $body,
        $status,
        ['Content-Type' => 'application/json; charset=utf-8', ...$headers]
    );
}

/**
 * Create a plain-text response.
 *
 * @param string|int|float|bool $data
 * @param array<string,string> $headers
 * @return array{status:int,headers:array<string,string>,body:string}
 */
function text(string|int|float|bool $data, int $status = 200, array $headers = []): array
{
    return response(
        (string) $data,
        $status,
        ['Content-Type' => 'text/plain; charset=utf-8', ...$headers]
    );
}
