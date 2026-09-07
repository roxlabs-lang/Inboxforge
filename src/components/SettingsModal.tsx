import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Laptop,
  Keyboard,
  Sliders,
  Check,
  X,
  HardDrive,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { UserSettings } from '../types';
import { nativeBridge } from '../services/nativeBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>({ ...settings });
  const [savedBadge, setSavedBadge] = useState(false);

  // Sync when incoming settings change
  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings, isOpen]);

  // Register Android back button handler to close modal
  useEffect(() => {
    if (!isOpen) return;
    return nativeBridge.registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Apply theme immediately to document for instantaneous live preview
  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    nativeBridge.triggerHaptic('selection');
    setLocalSettings((prev) => ({ ...prev, theme }));

    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    nativeBridge.setStatusBarTheme(isDark);
  };

  const handleSave = async () => {
    nativeBridge.triggerHaptic('success');
    await onSaveSettings(localSettings);
    setSavedBadge(true);
    setTimeout(() => {
      setSavedBadge(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Application Settings</h3>
              <p className="text-xs text-slate-400">Configure theme, engine preferences and mobile behavior</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Global Theme Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Interface Theme
              </span>
              <span className="text-[11px] text-indigo-400 font-medium">Instant Switch & Persisted</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Dark Theme */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition cursor-pointer ${
                  localSettings.theme === 'dark'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${localSettings.theme === 'dark' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Dark Mode</div>
                  <div className="text-[10px] text-slate-400">Obsidian Black</div>
                </div>
              </button>

              {/* Light Theme */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition cursor-pointer ${
                  localSettings.theme === 'light'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${localSettings.theme === 'light' ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Light Mode</div>
                  <div className="text-[10px] text-slate-400">Crisp Slate</div>
                </div>
              </button>

              {/* System Theme */}
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition cursor-pointer ${
                  localSettings.theme === 'system'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${localSettings.theme === 'system' ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">System Auto</div>
                  <div className="text-[10px] text-slate-400">Follows OS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Android Mobile Integration Status */}
          {nativeBridge.isAndroidNative() && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-emerald-200">InboxForge Android Native App</div>
                  <div className="text-[11px] text-emerald-400/80">Hardware acceleration, secure keystore & back-button enabled</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                {nativeBridge.getAppVersion()}
              </span>
            </div>
          )}
          {/* Generation & Engine Defaults */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Engine Performance & Checkpoints
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Default Worker Batch Size</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {localSettings.generationBatchSize.toLocaleString()} / chunk
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={25000}
                step={1000}
                value={localSettings.generationBatchSize}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, generationBatchSize: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <div className="font-semibold text-white">Auto-Checkpoint Frequency</div>
                <div className="text-[11px] text-slate-400">Frequency of saving crash recovery snapshots</div>
              </div>
              <select
                value={localSettings.checkpointFrequency}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, checkpointFrequency: Number(e.target.value) })
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value={5000}>Every 5,000</option>
                <option value={10000}>Every 10,000</option>
                <option value={25000}>Every 25,000</option>
                <option value={50000}>Every 50,000</option>
              </select>
            </div>
          </div>

          {/* Safety Confirmations */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Safety Confirmations
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs cursor-pointer">
              <div>
                <div className="font-semibold text-white">Confirm Before Deletion</div>
                <div className="text-[11px] text-slate-400">Prompt confirmation when deleting identities</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.confirmOnDelete}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, confirmOnDelete: e.target.checked })
                }
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard Shortcuts</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Focus Search:</span>
                <span className="text-indigo-400 font-bold">Ctrl + K</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Open Generator:</span>
                <span className="text-indigo-400 font-bold">Ctrl + G</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Clear Selection:</span>
                <span className="text-indigo-400 font-bold">Esc</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Copy Selected:</span>
                <span className="text-indigo-400 font-bold">Ctrl + C</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
            >
              {savedBadge ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
