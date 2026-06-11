<?php

namespace App\Repositories;

use League\OAuth2\Server\Entities\AccessTokenEntityInterface;
use League\OAuth2\Server\Repositories\AccessTokenRepositoryInterface;

class AccessTokenRepository implements AccessTokenRepositoryInterface
{
    private array $accessTokens = [];

    public function persistNewAccessToken(AccessTokenEntityInterface $accessTokenEntity): void
    {
        $this->accessTokens[$accessTokenEntity->getIdentifier()] = $accessTokenEntity;
    }

    public function revokeAccessToken($tokenId): void
    {
        unset($this->accessTokens[$tokenId]);
    }

    public function isAccessTokenRevoked($tokenId): bool
    {
        return !isset($this->accessTokens[$tokenId]);
    }

    public function getNewToken(
        \League\OAuth2\Server\Entities\ClientEntityInterface $clientEntity,
        array $scopes,
        $userIdentifier = null
    ): AccessTokenEntityInterface {
        $accessToken = new class implements AccessTokenEntityInterface {
            private string $identifier = '';
            private \DateTimeImmutable $expiryDateTime;
            private ?\League\OAuth2\Server\Entities\ClientEntityInterface $client;
            private string $userIdentifier = '';
            private array $scopes = [];

            public function setIdentifier(string $identifier): void
            {
                $this->identifier = $identifier;
            }

            public function getIdentifier(): string
            {
                return $this->identifier;
            }

            public function setExpiryDateTime(\DateTimeImmutable $dateTime): void
            {
                $this->expiryDateTime = $dateTime;
            }

            public function getExpiryDateTime(): \DateTimeImmutable
            {
                return $this->expiryDateTime;
            }

            public function setClient(\League\OAuth2\Server\Entities\ClientEntityInterface $client): void
            {
                $this->client = $client;
            }

            public function getClient(): \League\OAuth2\Server\Entities\ClientEntityInterface
            {
                return $this->client;
            }

            public function setUserIdentifier(string $identifier): void
            {
                $this->userIdentifier = $identifier;
            }

            public function getUserIdentifier(): ?string
            {
                return $this->userIdentifier ?: null;
            }

            public function addScope(\League\OAuth2\Server\Entities\ScopeEntityInterface $scope): void
            {
                $this->scopes[$scope->getIdentifier()] = $scope;
            }

            public function getScopes(): array
            {
                return array_values($this->scopes);
            }

            public function __toString(): string
            {
                return $this->identifier;
            }
        };

        return $accessToken;
    }
}
