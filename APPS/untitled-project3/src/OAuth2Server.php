<?php

namespace App;

use League\OAuth2\Server\AuthorizationServer;
use League\OAuth2\Server\Grant\ClientCredentialsGrant;
use League\OAuth2\Server\ResourceServer;
use App\Repositories\{
    ClientRepository,
    AccessTokenRepository,
    ScopeRepository
};

class OAuth2Server
{
    private AuthorizationServer $authorizationServer;
    private ResourceServer $resourceServer;

    public function __construct()
    {
        $privateKey = new \League\OAuth2\Server\CryptKey(
            'file://' . __DIR__ . '/../keys/private.key'
        );

        $publicKey = new \League\OAuth2\Server\CryptKey(
            'file://' . __DIR__ . '/../keys/public.key'
        );

        // Repositories
        $clientRepository = new ClientRepository();
        $accessTokenRepository = new AccessTokenRepository();
        $scopeRepository = new ScopeRepository();

        // Encryption key (for token encryption)
        $encryptionKey = new \League\OAuth2\Server\CryptKey(
            'file://' . __DIR__ . '/../keys/private.key'
        );

        // Create authorization server
        $this->authorizationServer = new AuthorizationServer(
            $clientRepository,
            $accessTokenRepository,
            $scopeRepository,
            $privateKey,
            $encryptionKey
        );

        // Enable Client Credentials grant
        $clientCredentialsGrant = new ClientCredentialsGrant(
            $clientRepository,
            $accessTokenRepository,
            $scopeRepository
        );
        $this->authorizationServer->enableGrantType(
            $clientCredentialsGrant,
            new \DateInterval('PT1H')
        );

        // Create resource server
        $this->resourceServer = new ResourceServer(
            $accessTokenRepository,
            $publicKey
        );
    }

    public function getAuthorizationServer(): AuthorizationServer
    {
        return $this->authorizationServer;
    }

    public function getResourceServer(): ResourceServer
    {
        return $this->resourceServer;
    }
}


