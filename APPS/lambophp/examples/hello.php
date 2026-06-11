<?php

declare(strict_types=1);

require __DIR__ . '/../src/lambophp.php';

$routes = [
    get('/', fn(array $req): array => response('Hello Lambo 🏎️')),
];

$app = pipe(
    with_routes($routes)
);

$response = $app(request());
send($response);
