import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ConnectionBanner({ loading, error, status }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting to live session
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
        <AlertTriangle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-4 w-4" />
      {status}
    </div>
  );
}
