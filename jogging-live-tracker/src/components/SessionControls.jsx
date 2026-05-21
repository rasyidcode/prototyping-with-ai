import { Copy, ExternalLink, Play, Square, Trash2 } from 'lucide-react';
import Button from './Button.jsx';

export default function SessionControls({
  active,
  creating,
  sessionId,
  shareUrl,
  onStart,
  onStop,
  onCleanup,
}) {
  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <section className="space-y-4 rounded-lg bg-white p-4 shadow-panel ring-1 ring-slate-200">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">Jog Live Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a temporary live session, share the tracking link, then start jogging.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {!active ? (
          <Button className="w-full sm:w-auto" disabled={creating} onClick={onStart}>
            <Play className="h-4 w-4" />
            {creating ? 'Starting' : 'Start session'}
          </Button>
        ) : (
          <Button className="w-full sm:w-auto" onClick={onStop} variant="secondary">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}
        {sessionId && (
          <Button className="w-full sm:w-auto" onClick={onCleanup} variant="ghost">
            <Trash2 className="h-4 w-4" />
            Clear local session
          </Button>
        )}
      </div>

      {shareUrl && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="share-url">
            Share URL
          </label>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              id="share-url"
              readOnly
              value={shareUrl}
            />
            <Button aria-label="Copy share URL" onClick={copyShareUrl} variant="secondary">
              <Copy className="h-4 w-4" />
            </Button>
            <a
              aria-label="Open tracking page"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
              href={shareUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
