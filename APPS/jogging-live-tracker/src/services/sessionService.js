import {
  child,
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { db } from '../firebase/config.js';
import { isSessionInactive } from '../utils/time.js';

const SESSIONS_PATH = 'sessions';

export function createSessionId() {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return id.replace(/-/g, '').slice(0, 12);
}

export async function createJoggingSession() {
  const id = createSessionId();
  const now = Date.now();

  await set(ref(db, `${SESSIONS_PATH}/${id}`), {
    id,
    status: 'active',
    createdAt: now,
    startedAt: now,
    stoppedAt: null,
    lastUpdatedAt: now,
    sos: false,
    sosAt: null,
    battery: null,
    current: null,
    points: {},
  });

  await onDisconnect(ref(db, `${SESSIONS_PATH}/${id}/connection`)).set({
    state: 'offline',
    at: serverTimestamp(),
  });

  return id;
}

export function subscribeToSession(sessionId, callback) {
  const sessionRef = ref(db, `${SESSIONS_PATH}/${sessionId}`);

  return onValue(
    sessionRef,
    async (snapshot) => {
      const value = snapshot.val();

      if (value?.status === 'active' && isSessionInactive(value.lastUpdatedAt)) {
        await markSessionExpired(sessionId);
        callback({ ...value, status: 'expired' });
        return;
      }

      callback(value);
    },
    (error) => callback(null, error),
  );
}

export async function getSession(sessionId) {
  const snapshot = await get(ref(db, `${SESSIONS_PATH}/${sessionId}`));
  return snapshot.val();
}

export async function uploadLocation(sessionId, location, battery) {
  const now = Date.now();
  const sessionRef = ref(db, `${SESSIONS_PATH}/${sessionId}`);
  const pointRef = push(child(sessionRef, 'points'));

  const point = {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
    speed: location.speed ?? null,
    heading: location.heading ?? null,
    timestamp: location.timestamp ?? now,
  };

  await update(sessionRef, {
    current: point,
    battery: battery ?? null,
    lastUpdatedAt: now,
    status: 'active',
    [`points/${pointRef.key}`]: point,
  });
}

export async function stopSession(sessionId) {
  await update(ref(db, `${SESSIONS_PATH}/${sessionId}`), {
    status: 'stopped',
    stoppedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  });
}

export async function markSessionExpired(sessionId) {
  await update(ref(db, `${SESSIONS_PATH}/${sessionId}`), {
    status: 'expired',
    expiredAt: Date.now(),
  });
}

export async function triggerSos(sessionId) {
  await update(ref(db, `${SESSIONS_PATH}/${sessionId}`), {
    sos: true,
    sosAt: Date.now(),
    lastUpdatedAt: Date.now(),
  });
}

export async function clearSos(sessionId) {
  await update(ref(db, `${SESSIONS_PATH}/${sessionId}`), {
    sos: false,
    sosAt: null,
    lastUpdatedAt: Date.now(),
  });
}

export async function cleanupSession(sessionId) {
  await remove(ref(db, `${SESSIONS_PATH}/${sessionId}`));
}
