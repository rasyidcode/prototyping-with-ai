import { AlertTriangle, ArrowLeft, MapPinned } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConnectionBanner from '../components/ConnectionBanner.jsx';
import LiveMap from '../components/LiveMap.jsx';
import StatusPanel from '../components/StatusPanel.jsx';
import { useNow } from '../hooks/useNow.js';
import { useSession } from '../hooks/useSession.js';
import { sortPoints } from '../utils/geo.js';

export default function TrackPage() {
  const { sessionId } = useParams();
  const { session, loading, error } = useSession(sessionId);
  const now = useNow();
  const points = sortPoints(session?.points);
  const missing = !loading && !error && !session;
  const inactive = session?.status === 'stopped' || session?.status === 'expired';

  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="absolute inset-0">
        <LiveMap current={session?.current} follow={!inactive} points={points} sos={session?.sos} />
      </div>

      <div className="pointer-events-none relative z-[500] flex min-h-screen flex-col justify-between p-3 md:p-5">
        <div className="pointer-events-auto flex flex-col gap-3 sm:max-w-md">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-panel ring-1 ring-slate-200"
            to="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Runner
          </Link>

          <ConnectionBanner
            error={error || (missing ? 'This tracking session was not found.' : null)}
            loading={loading}
            status={inactive ? `Session ${session.status}` : 'Receiving live updates'}
          />

          {session?.sos && (
            <div className="flex items-center gap-3 rounded-lg bg-red-600 p-4 text-white shadow-panel">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-bold">SOS emergency alert</div>
                <div className="text-sm text-red-50">The runner has requested immediate help.</div>
              </div>
            </div>
          )}

          {!session?.current && !loading && !missing && (
            <div className="flex items-center gap-3 rounded-lg bg-white p-4 text-sm text-slate-700 shadow-panel ring-1 ring-slate-200">
              <MapPinned className="h-5 w-5 shrink-0 text-teal-700" />
              Waiting for the first GPS update.
            </div>
          )}
        </div>

        {session && (
          <div className="pointer-events-auto rounded-lg bg-slate-50/95 p-3 shadow-panel backdrop-blur md:mx-auto md:w-full md:max-w-4xl">
            <StatusPanel now={now} pointCount={points.length} session={session} />
          </div>
        )}
      </div>
    </div>
  );
}
