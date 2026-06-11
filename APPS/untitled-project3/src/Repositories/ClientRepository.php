<?php

namespace App\Repositories;

use League\OAuth2\Server\Entities\ClientEntityInterface;
use League\OAuth2\Server\Repositories\ClientRepositoryInterface;

class ClientRepository implements ClientRepositoryInterface
{
    private array $clients = [];

    public function __construct()
    {
        // In-memory clients
        $this->clients = [
            'demo_client' => [
                'secret' => password_hash('demo_secret', PASSWORD_BCRYPT),
                'name' => 'Demo Client',
                'isConfidential' => true,
            ],
        ];
    }

    public function validateClient($clientIdentifier, $clientSecret, $grantType): bool
    {
        if (!isset($this->clients[$clientIdentifier])) {
            return false;
        }

        $client = $this->clients[$clientIdentifier];
        return password_verify($clientSecret, $client['secret']);
    }

    public function getClientEntity($clientIdentifier): ?ClientEntityInterface
    {
        if (!isset($this->clients[$clientIdentifier])) {
            return null;
        }

        $client = new class implements ClientEntityInterface {
            private string $identifier = '';
            private string $name = '';
            private array $redirectUris = [];
            private bool $isConfidential = false;

            public function setIdentifier(string $identifier): void
            {
                $this->identifier = $identifier;
            }

            public function getIdentifier(): string
            {
                return $this->identifier;
            }

            public function setName(string $name): void
            {
                $this->name = $name;
            }

            public function getName(): string
            {
                return $this->name;
            }

            public function setRedirectUri(string $uri): void
            {
                $this->redirectUris[] = $uri;
            }

            public function getRedirectUri(): string
            {
                return $this->redirectUris[0] ?? '';
            }

            public function getRedirectUris(): array
            {
                return $this->redirectUris;
            }

            public function setIsConfidential(bool $confidential): void
            {
                $this->isConfidential = $confidential;
            }

            public function isConfidential(): bool
            {
                return $this->isConfidential;
            }
        };

        $client->setIdentifier($clientIdentifier);
        $client->setName($this->clients[$clientIdentifier]['name']);
        $client->setIsConfidential($this->clients[$clientIdentifier]['isConfidential']);

        return $client;
    }

    public function validateClientCredentials($clientIdentifier, $clientSecret): bool
    {
        if (!isset($this->clients[$clientIdentifier])) {
            return false;
        }

        $client = $this->clients[$clientIdentifier];
        return password_verify($clientSecret, $client['secret']);
    }
}

