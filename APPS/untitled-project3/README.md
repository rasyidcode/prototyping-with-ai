# OAuth 2.0 Server with Slim 4

A production-ready OAuth 2.0 authorization server built with PHP, Slim 4 Framework, and League OAuth2 Server library.

## Features

- ✅ **Client Credentials Grant** - Service-to-service authentication
- ✅ **In-Memory Repositories** - Easy to extend with database backends
- ✅ **JWT Access Tokens** - Using RS256 algorithm with RSA keys
- ✅ **Scope Support** - Fine-grained permission control
- ✅ **Token Expiration** - Configurable TTL for access tokens
- ✅ **REST API** - JSON endpoints for token generation

## Requirements

- PHP 8.0+
- Composer
- OpenSSL (for key generation)

## Installation

1. Clone or setup the project:

```bash
cd untitled-project3
```

2. Install dependencies:

```bash
composer install
```

3. Crypto keys are already generated in `keys/` directory

## Project Structure

```
.
├── public/
│   └── index.php              # Main application entry point
├── src/
│   ├── OAuth2Server.php       # OAuth 2.0 server configuration
│   └── Repositories/          # Data access layer
│       ├── ClientRepository.php
│       ├── AccessTokenRepository.php
│       ├── ScopeRepository.php
│       └── ClientCredentialsGrantRepository.php
├── keys/
│   ├── private.key           # RSA private key (keep secret!)
│   └── public.key            # RSA public key (can be shared)
└── vendor/                    # Composer dependencies
```

## Usage

### Start the Server

```bash
php -S localhost:8080 -t public
```

The server will start at `http://localhost:8080`

### Health Check

```bash
curl http://localhost:8080/
```

Response:

```json
{
  "status": "ok",
  "message": "OAuth 2.0 Server is running",
  "endpoints": {
    "token": "POST /oauth/token"
  }
}
```

### Get Access Token (Client Credentials)

```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=demo_client" \
  -d "client_secret=demo_secret" \
  -d "scope=read write"
```

Response:

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

### Use the Access Token

Include the token in requests:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://your-api.com/api/resource
```

## Configuration

### Client Credentials

Currently defined in `src/Repositories/ClientRepository.php`:

- **Client ID**: `demo_client`
- **Client Secret**: `demo_secret`

To add more clients, edit the `__construct()` method:

```php
$this->clients = [
    'demo_client' => [
        'secret' => password_hash('demo_secret', PASSWORD_BCRYPT),
        'name' => 'Demo Client',
        'isConfidential' => true,
    ],
    'your_client' => [
        'secret' => password_hash('your_secret', PASSWORD_BCRYPT),
        'name' => 'Your Client',
        'isConfidential' => true,
    ],
];
```

### Token Expiration

Modify in `src/OAuth2Server.php`:

```php
$this->authorizationServer->enableGrantType(
    $clientCredentialsGrant,
    new \DateInterval('PT1H')  // 1 hour - change as needed
);
```

### Available Scopes

Defined in `src/Repositories/ScopeRepository.php`:

- `read` - Read access
- `write` - Write access

Add more scopes:

```php
private array $scopes = [
    'read' => ['identifier' => 'read', 'name' => 'Read access'],
    'write' => ['identifier' => 'write', 'name' => 'Write access'],
    'admin' => ['identifier' => 'admin', 'name' => 'Admin access'],
];
```

## Security Considerations

1. **Private Key**: Never commit `keys/private.key` to version control
2. **Client Secrets**: Use strong secrets in production
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Never store tokens in plain text
5. **Secret Rotation**: Implement key rotation policies

## Extending the Server

### Add Database Support

Replace in-memory repositories with database implementations:

1. Create database repositories implementing the interface
2. Update `OAuth2Server.php` to use new repositories
3. Example: Create `src/Repositories/DatabaseClientRepository.php`

### Add Authorization Code Grant

Add to `src/OAuth2Server.php`:

```php
use League\OAuth2\Server\Grant\AuthorizationCodeGrant;

$authCodeGrant = new AuthorizationCodeGrant(
    $clientRepository,
    $accessTokenRepository,
    $scopeRepository,
    $authCodeRepository,
    $refreshTokenRepository,
    $privateKey
);

$this->authorizationServer->enableGrantType(
    $authCodeGrant,
    new \DateInterval('PT10M')
);
```

### Add Refresh Token Support

1. Create `RefreshTokenRepository`
2. Add refresh token repository to grant
3. Handle `/oauth/token` with `refresh_token` grant type

## Testing with cURL

Test full token flow:

```bash
#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=demo_client" \
  -d "client_secret=demo_secret" \
  -d "scope=read" \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# Use token (assuming your API is on port 8081)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/resource
```

## License

MIT

## References

- [League OAuth2 Server Docs](https://oauth2.thephpleague.com/)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [Slim Framework Docs](https://www.slimframework.com/)
