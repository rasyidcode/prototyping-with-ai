# LamboPHP Examples

Run with the built-in PHP server from the repository root:

```bash
php -S localhost:8000 -t examples
```

Then open:

- `http://localhost:8000/hello.php`
- `http://localhost:8000/all_features.php`

## What each example covers

### `hello.php`
- `get()` route definition
- `with_routes()` router middleware
- `pipe()` application composition
- `request()` / `send()` runtime flow
- `response()` response builder

### `all_features.php`
- `get()` and `post()` routes
- Named route params (`/users/{id}`)
- `with_routes()` dispatch and `params`
- `pipe()` middleware composition
- `middleware()` helper
- custom middleware wrapper shape (`fn($next) => fn($req) => ...`)
- `json()` and `text()` utility responses
- `match_route()` usage snippet in comments for direct matching demos
