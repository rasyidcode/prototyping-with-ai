import { Battery, Clock, Gauge, MapPin, Radio, Siren } from 'lucide-react';
import { formatSpeed } from '../utils/geo.js';
import { formatDuration, formatTimestamp } from '../utils/time.js';

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-700" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="truncate text-base font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  );
}

export default function StatusPanel({ session, now, pointCount = 0 }) {
  const endedAt = session?.stoppedAt ?? (session?.status === 'expired' ? session?.expiredAt : now);
  const battery =
    session?.battery == null ? 'Unavailable' : `${session.battery}%${session.batteryCharging ? ' charging' : ''}`;

  return (
    <section className="space-y-3">
      {session?.sos && (
        <div className="flex items-center gap-3 rounded-lg bg-red-600 p-4 font-semibold text-white shadow-panel">
          <Siren className="h-5 w-5 shrink-0" />
          SOS alert sent at {formatTimestamp(session.sosAt)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icon={Gauge} label="Speed" value={formatSpeed(session?.current?.speed)} />
        <Stat icon={Clock} label="Duration" value={formatDuration(session?.startedAt, endedAt)} />
        <Stat icon={Radio} label="Updated" value={formatTimestamp(session?.lastUpdatedAt)} />
        <Stat icon={Battery} label="Battery" value={battery} />
        <Stat icon={MapPin} label="Trail" value={`${pointCount} points`} />
        <Stat icon={Radio} label="Status" value={session?.status ?? 'Unknown'} />
      </div>
    </section>
  );
}
