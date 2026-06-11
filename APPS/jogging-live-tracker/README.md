# Jog Live Tracker

A lightweight React + Firebase Realtime Database web app for temporary live location sharing during jogging sessions.

## Features

- Mobile-first React web app, installable as a PWA.
- Firebase Realtime Database is the only backend.
- Leaflet + OpenStreetMap live map.
- Browser Geolocation API tracking.
- Temporary share URLs at `/track/:sessionId`.
- Live marker, trail polyline, speed, last update time, battery percentage, and duration.
- SOS button that updates Firebase immediately and alerts viewers.
- Client-driven inactive session expiration.
- Battery-conscious location uploads that skip insignificant movement.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Firebase project and enable Realtime Database.

3. Copy `.env.example` to `.env` and fill in the Firebase web app values:

   ```bash
   cp .env.example .env
   ```

4. Run locally:

   ```bash
   npm run dev
   ```

5. Build for production:

   ```bash
   npm run build
   ```

## Firebase Realtime Database Rules

For quick local testing only:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

For production, add authentication or a per-session write token so only the runner can update location and SOS state.

## Data Model

```json
{
  "sessions": {
    "{sessionId}": {
      "id": "abc123",
      "status": "active",
      "createdAt": 1710000000000,
      "startedAt": 1710000000000,
      "stoppedAt": null,
      "lastUpdatedAt": 1710000000000,
      "sos": false,
      "sosAt": null,
      "battery": 84,
      "current": {
        "lat": -6.2,
        "lng": 106.8,
        "accuracy": 12,
        "speed": 2.4,
        "heading": 90,
        "timestamp": 1710000000000
      },
      "points": {
        "{pushId}": {
          "lat": -6.2,
          "lng": 106.8,
          "accuracy": 12,
          "speed": 2.4,
          "timestamp": 1710000000000
        }
      }
    }
  }
}
```

## Notes

- Location tracking requires HTTPS in production. `localhost` works for development.
- Battery status depends on `navigator.getBattery`, which is not available in every browser.
- Sessions expire client-side after 10 minutes of inactivity. Without Cloud Functions or another backend, deletion cannot be guaranteed server-side.
