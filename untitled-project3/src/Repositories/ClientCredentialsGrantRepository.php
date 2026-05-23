<?php

namespace App\Repositories;

use League\OAuth2\Server\Repositories\ClientCredentialsGrantRepositoryInterface;

class ClientCredentialsGrantRepository implements ClientCredentialsGrantRepositoryInterface
{
    public function validateClientCredentials(
        \League\OAuth2\Server\Entities\ClientEntityInterface $clientEntity,
        string $clientSecret
    ): bool {
        // Validation already done in ClientRepository
        return true;
    }
}
