const EARTH_RADIUS_METERS = 6371000;

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatSpeed(speedMetersPerSecond) {
  if (speedMetersPerSecond == null || Number.isNaN(speedMetersPerSecond)) {
    return '0.0 km/h';
  }

  return `${(speedMetersPerSecond * 3.6).toFixed(1)} km/h`;
}

export function sortPoints(points = {}) {
  return Object.values(points).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
