<?php

namespace App\Repositories;

use League\OAuth2\Server\Repositories\ScopeRepositoryInterface;
use League\OAuth2\Server\Entities\ScopeEntityInterface;

class ScopeRepository implements ScopeRepositoryInterface
{
    private array $scopes = [
        'read' => ['identifier' => 'read', 'name' => 'Read access'],
        'write' => ['identifier' => 'write', 'name' => 'Write access'],
    ];

    public function getScopeEntityByIdentifier($identifier): ?ScopeEntityInterface
    {
        if (!isset($this->scopes[$identifier])) {
            return null;
        }

        $scope = new class implements ScopeEntityInterface {
            private string $identifier = '';

            public function setIdentifier(string $identifier): void
            {
                $this->identifier = $identifier;
            }

            public function getIdentifier(): string
            {
                return $this->identifier;
            }

            public function jsonSerialize(): mixed
            {
                return $this->identifier;
            }
        };

        $scope->setIdentifier($identifier);
        return $scope;
    }

    public function finalizeScopes(
        array $scopes,
        $grantType,
        \League\OAuth2\Server\Entities\ClientEntityInterface $clientEntity,
        $userIdentifier = null
    ): array {
        return $scopes;
    }
}
