import { useCallback, useEffect, useRef, useState } from 'react';
import { getDistanceMeters } from '../utils/geo.js';

const MIN_UPLOAD_INTERVAL_MS = 3500;
const KEEPALIVE_INTERVAL_MS = 30000;
const MIN_DISTANCE_METERS = 8;

export function useGeolocationTracking({ active, sessionId, batteryLevel, onLocationUpload }) {
  const [state, setState] = useState({
    permission: 'idle',
    error: null,
    current: null,
    uploading: false,
  });

  const lastUploadedRef = useRef(null);
  const watchIdRef = useRef(null);
  const uploadRef = useRef(onLocationUpload);

  useEffect(() => {
    uploadRef.current = onLocationUpload;
  }, [onLocationUpload]);

  const handlePosition = useCallback(
    async (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      setState((previous) => ({
        ...previous,
        permission: 'granted',
        error: null,
        current: location,
      }));

      if (!sessionId || !uploadRef.current) return;

      const lastUploaded = lastUploadedRef.current;
      const elapsed = lastUploaded ? Date.now() - lastUploaded.uploadedAt : Number.POSITIVE_INFINITY;
      const moved = getDistanceMeters(lastUploaded?.location, location);
      const shouldUpload =
        elapsed >= MIN_UPLOAD_INTERVAL_MS &&
        (moved >= MIN_DISTANCE_METERS || elapsed >= KEEPALIVE_INTERVAL_MS);

      if (!shouldUpload) return;

      try {
        setState((previous) => ({ ...previous, uploading: true }));
        await uploadRef.current(location, batteryLevel);
        lastUploadedRef.current = { location, uploadedAt: Date.now() };
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: 'Could not upload your location. Check your connection.',
        }));
        console.error(error);
      } finally {
        setState((previous) => ({ ...previous, uploading: false }));
      }
    },
    [batteryLevel, sessionId],
  );

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setState((previous) => ({
        ...previous,
        permission: 'unsupported',
        error: 'This browser does not support GPS tracking.',
      }));
      return;
    }

    setState((previous) => ({ ...previous, permission: 'requesting', error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setState((previous) => ({
          ...previous,
          permission: denied ? 'denied' : 'error',
          error: denied
            ? 'Location permission was denied. Enable location access to start live tracking.'
            : 'GPS is unavailable right now. Move outside or check device location settings.',
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2500,
        timeout: 15000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, handlePosition]);

  return state;
}
