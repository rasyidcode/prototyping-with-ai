# Jojoify Backend

Deno HTTP API for the React frontend.

## Setup

Create a local `.env` file:

```sh
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`, then run:

```sh
deno task dev
```

The server defaults to `http://localhost:8000`.

## Endpoints

- `GET /api/health` - health check
- `POST /api/transform` - transforms an uploaded base64 image with Gemini

Example transform body:

```json
{
  "base64Image": "data:image/jpeg;base64,...",
  "standName": "STAR PLATINUM",
  "muscularity": 8,
  "sharpness": 7
}
```
