export const SESSION_INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

export function isSessionInactive(lastUpdatedAt, now = Date.now()) {
  return !lastUpdatedAt || now - lastUpdatedAt > SESSION_INACTIVITY_LIMIT_MS;
}

export function formatDuration(startedAt, endedAt = Date.now()) {
  if (!startedAt) return '00:00';

  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}
