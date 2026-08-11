import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { settingsService, type AppSettings } from '@/lib/settings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>({ keep_original_recordings: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    settingsService.getAll()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleToggle = async (value: boolean) => {
    setSettings((prev) => ({ ...prev, keep_original_recordings: value }));
    setSaving(true);
    try {
      await settingsService.update({ keep_original_recordings: value });
    } catch {
      setSettings((prev) => ({ ...prev, keep_original_recordings: !value }));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-stone-900 border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-light text-white/90">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Storage</h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex-1 pr-4">
                  <div className="text-sm text-white/80 mb-1">Keep original recordings</div>
                  <div className="text-xs text-white/40">
                    Keep original audio and video recordings on this device after processing.
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(!settings.keep_original_recordings)}
                  disabled={saving}
                  className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
                    settings.keep_original_recordings
                      ? 'bg-amber-500'
                      : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      settings.keep_original_recordings ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
