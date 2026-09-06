import React from 'react';
import type { ThemeDefinition } from '../../types/readme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  themes: ThemeDefinition[];
  currentThemeId: string;
  onSelectTheme: (themeKey: string) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  themes,
  currentThemeId,
  onSelectTheme,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Theme</h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose a color palette and visual styling for your README
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Themes Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((theme) => {
            const isSelected = theme.themeKey === currentThemeId;
            return (
              <div
                key={theme.themeId}
                onClick={() => {
                  onSelectTheme(theme.themeKey);
                  onClose();
                }}
                className={`group rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {theme.name}
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{theme.description}</p>
                </div>

                {/* Color Palette Swatches */}
                <div className="pt-3 border-t border-slate-700/40 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: theme.palette.primary }}
                      title="Primary"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: theme.palette.accent }}
                      title="Accent"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: theme.palette.background }}
                      title="Background"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: theme.palette.text }}
                      title="Text"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    {theme.style.tableStyle} table
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
