import React from 'react';
import { Moon, Sun, Monitor, Check, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

const THEME_OPTIONS = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep matte charcoal built for low-light focus',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Clean high-clarity daylight studio surfaces',
    icon: Sun,
  },
  {
    value: 'system',
    label: 'System Default',
    description: 'Automatically follows your device appearance',
    icon: Monitor,
  },
];

export default function AppearanceSettings() {
  const { theme, systemTheme, setTheme, isSaving, saveStatus, error } = useTheme();

  return (
    <section
      aria-labelledby="settings-appearance-heading"
      className="bg-[#181818] border border-[#303030] rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EB3E2E]/10 border border-[#EB3E2E]/30 flex items-center justify-center text-[#EB3E2E] shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="settings-appearance-heading"
              className="text-sm font-bold uppercase tracking-wide text-[#F5F5F5]"
            >
              Appearance
            </h3>
            <p className="text-xs text-[#B8B8B8]">
              Choose how Man &amp; Machine dashboards look for your account across sessions and devices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSaving && (
            <span className="text-[11px] font-mono text-[#B8B8B8] px-2.5 py-1 rounded-full bg-[#202020] border border-[#303030]">
              Saving...
            </span>
          )}
          {!isSaving && saveStatus && !error && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#B8B8B8] font-semibold">
            Theme
          </span>
          {theme === 'system' && (
            <span className="text-[11px] font-mono text-[#858585]">
              OS active: <strong className="text-[#F5F5F5] capitalize">{systemTheme}</strong>
            </span>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Dashboard theme preference"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`theme-option-${option.value}`}
                onClick={() => setTheme(option.value)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EB3E2E] ${
                  isSelected
                    ? 'bg-[#EB3E2E]/10 border-[#EB3E2E] shadow-sm'
                    : 'bg-[#111111] border-[#303030] hover:bg-[#202020]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-[#EB3E2E] border-[#EB3E2E] text-white'
                      : 'bg-[#202020] border-[#303030] text-[#B8B8B8]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                      {option.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B8B8] leading-snug mt-0.5">
                    {option.description}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-3.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[#EB3E2E] bg-[#EB3E2E] text-white'
                      : 'border-[#303030] bg-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
        >
          {error}
        </div>
      )}
    </section>
  );
}
