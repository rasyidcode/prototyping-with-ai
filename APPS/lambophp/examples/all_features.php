<?php

declare(strict_types=1);

require __DIR__ . '/../src/lambophp.php';

$routes = [
    get('/', fn(array $req): array => text('LamboPHP is running')),

    get('/users/{id}', fn(array $req): array => json([
        'message' => 'User profile',
        'user_id' => $req['params']['id'] ?? null,
    ])),

    post('/echo', fn(array $req): array => json([
        'method' => $req['method'],
        'raw_body' => $req['body'],
        'parsed_body' => $req['parsed_body'],
    ])),
];

// Generic middleware() helper demo: add a trace id and response header.
$trace = middleware(
    function (array $req): array {
        $req['trace_id'] = bin2hex(random_bytes(4));
        return $req;
    },
    function (array $res): array {
        $res['headers']['X-LamboPHP'] = 'trace-enabled';
        return $res;
    }
);

// Custom middleware demo: method guard before route handling.
$rejectDelete = function (callable $next): callable {
    return function (array $req) use ($next): array {
        if (($req['method'] ?? '') === 'DELETE') {
            return text('DELETE not allowed in this example', 405);
        }

        return $next($req);
    };
};

$app = pipe(
    $trace,
    $rejectDelete,
    with_routes($routes)
);

// Normal runtime flow (uses request()).
$response = $app(request());
send($response);

/*
CLI demo snippets (optional):

$fakeGet = [
    'method' => 'GET',
    'path' => '/users/42',
    'uri' => '/users/42',
    'query' => [],
    'params' => [],
    'headers' => [],
    'body' => '',
    'parsed_body' => [],
];

$matched = match_route($routes, $fakeGet); // Demonstrates route matching helpers.
$demoResponse = $app($fakeGet);            // Demonstrates pipe(...)->handler($request).
*/
