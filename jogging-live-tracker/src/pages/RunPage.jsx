import { AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import ConnectionBanner from '../components/ConnectionBanner.jsx';
import LiveMap from '../components/LiveMap.jsx';
import SessionControls from '../components/SessionControls.jsx';
import SosButton from '../components/SosButton.jsx';
import StatusPanel from '../components/StatusPanel.jsx';
import { useBatteryStatus } from '../hooks/useBatteryStatus.js';
import { useGeolocationTracking } from '../hooks/useGeolocationTracking.js';
import { useNow } from '../hooks/useNow.js';
import { useSession } from '../hooks/useSession.js';
import {
  cleanupSession,
  clearSos,
  createJoggingSession,
  stopSession,
  triggerSos,
  uploadLocation,
} from '../services/sessionService.js';
import { sortPoints } from '../utils/geo.js';

export default function RunPage() {
  const [sessionId, setSessionId] = useState(() => window.localStorage.getItem('activeSessionId'));
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState(null);
  const battery = useBatteryStatus();
  const now = useNow();
  const { session, loading, error } = useSession(sessionId);
  const active = Boolean(sessionId && session?.status === 'active');
  const points = useMemo(() => sortPoints(session?.points), [session?.points]);
  const shareUrl = sessionId ? `${window.location.origin}/track/${sessionId}` : '';

  const handleUpload = useCallback(
    (location, batteryLevel) => uploadLocation(sessionId, location, batteryLevel),
    [sessionId],
  );

  const geoState = useGeolocationTracking({
    active,
    sessionId,
    batteryLevel: battery.level,
    onLocationUpload: handleUpload,
  });

  async function startSession() {
    setCreating(true);
    setLocalError(null);
    try {
      const id = await createJoggingSession();
      window.localStorage.setItem('activeSessionId', id);
      setSessionId(id);
    } catch (err) {
      setLocalError('Could not create a Firebase session. Check your configuration.');
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleStop() {
    if (!sessionId) return;
    await stopSession(sessionId);
  }

  async function handleCleanup() {
    if (sessionId && session?.status !== 'active') {
      await cleanupSession(sessionId);
    }
    window.localStorage.removeItem('activeSessionId');
    setSessionId(null);
  }

  async function handleSos() {
    if (!sessionId) return;
    await triggerSos(sessionId);
  }

  async function handleClearSos() {
    if (!sessionId) return;
    await clearSos(sessionId);
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-4 p-3 md:grid-cols-[380px_minmax(0,1fr)] md:p-5">
      <div className="space-y-4 md:order-1">
        <SessionControls
          active={active}
          creating={creating}
          onCleanup={handleCleanup}
          onStart={startSession}
          onStop={handleStop}
          sessionId={sessionId}
          shareUrl={shareUrl}
        />

        <ConnectionBanner
          error={localError || error}
          loading={Boolean(sessionId && loading)}
          status={active ? 'Live session active' : 'Ready'}
        />

        {geoState.error && (
          <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {geoState.error}
          </div>
        )}

        {active && (
          <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              {geoState.uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              ) : (
                <Navigation className="h-4 w-4 text-teal-700" />
              )}
              GPS permission: {geoState.permission}
            </div>
          </div>
        )}

        <SosButton active={active} onClear={handleClearSos} onTrigger={handleSos} sos={session?.sos} />

        {session && <StatusPanel now={now} pointCount={points.length} session={session} />}
      </div>

      <div className="min-h-[55vh] overflow-hidden rounded-lg bg-slate-200 shadow-panel md:order-2 md:min-h-[calc(100vh-2.5rem)]">
        <LiveMap current={session?.current ?? geoState.current} follow points={points} sos={session?.sos} />
      </div>
    </div>
  );
}
