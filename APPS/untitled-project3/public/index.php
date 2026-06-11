<?php

use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Slim\Factory\AppFactory;
use Slim\Exception\HttpNotFoundException;

// Autoload
require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

// Error handling
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// OAuth 2.0 Token endpoint
$app->post('/oauth/token', function (RequestInterface $request, ResponseInterface $response) {
    try {
        $oauth2 = new \App\OAuth2Server();
        $server = $oauth2->getAuthorizationServer();

        $response = $server->respondToAccessTokenRequest($request, $response);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Cache-Control', 'no-store')
            ->withHeader('Pragma', 'no-cache');
    } catch (\League\OAuth2\Server\Exception\OAuthServerException $exception) {
        return $exception->generateHttpResponse($response);
    } catch (\Exception $exception) {
        $response->getBody()->write(json_encode(['error' => $exception->getMessage()]));
        return $response
            ->withStatus(500)
            ->withHeader('Content-Type', 'application/json');
    }
});

// Health check
$app->get('/', function (RequestInterface $request, ResponseInterface $response) {
    $response->getBody()->write(json_encode([
        'status' => 'ok',
        'message' => 'OAuth 2.0 Server is running',
        'endpoints' => [
            'token' => 'POST /oauth/token',
        ]
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->run();
