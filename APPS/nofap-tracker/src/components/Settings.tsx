import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Calendar, 
  AlertTriangle,
  Check
} from 'lucide-react';

interface SettingsProps {
  startDate: string;
  onUpdateStartDate: (dateIso: string) => void;
  onExportData: () => void;
  onImportData: (jsonData: string) => boolean;
  onResetAllData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  startDate,
  onUpdateStartDate,
  onExportData,
  onImportData,
  onResetAllData
}) => {
  const [localStartDate, setLocalStartDate] = useState(() => {
    // Format ISO string to datetime-local input format YYYY-MM-DDThh:mm
    const dateObj = new Date(startDate);
    const timezoneOffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(dateObj.getTime() - timezoneOffset).toISOString().slice(0, 16);
    return localISOTime;
  });

  const [dateSaved, setDateSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isoDate = new Date(localStartDate).toISOString();
    onUpdateStartDate(isoDate);
    setDateSaved(true);
    setTimeout(() => setDateSaved(false), 3000);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const success = onImportData(content);
        if (success) {
          setImportStatus({ type: 'success', message: 'Data imported successfully! Reloading...' });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setImportStatus({ type: 'error', message: 'Import failed: Invalid data structure.' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Import failed: Invalid JSON file.' });
      }
    };
    reader.readAsText(file);
    // Reset input so file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Settings & Backup</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your streak preferences, manage backups, or reset your journey data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Streak Configuration */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Adjust Streak Start
          </h3>

          <form onSubmit={handleDateSubmit} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              If you did not start tracking exactly at this moment, you can backdate or adjust your current streak start time here.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Streak Starting Date & Time</label>
              <input
                type="datetime-local"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              {dateSaved ? (
                <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Start date updated
                </span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </form>
        </div>

        {/* Data Portability */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-400" />
              Backup & Recovery
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Your recovery progress is stored entirely in your local browser storage. Export a backup JSON file so you can transfer your data or prevent loss.
            </p>
          </div>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onExportData}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer select-none"
              >
                <Download className="w-4 h-4 text-purple-400" />
                Export JSON
              </button>

              <button
                onClick={triggerImportClick}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer select-none"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                Import JSON
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className={`p-3 rounded-xl border text-xs font-semibold text-center ${
                importStatus.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {importStatus.message}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-6 rounded-2xl border border-red-500/15 bg-red-950/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/2 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2 m-0">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              Danger Zone
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Resetting will clear all your streaks, relapse history, reflections, and logged urges. This action is permanent and cannot be undone.
            </p>
          </div>

          <div className="shrink-0">
            {showResetConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onResetAllData();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-red-600/10 cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-4.5 py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-200 hover:text-red-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Reset All App Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
