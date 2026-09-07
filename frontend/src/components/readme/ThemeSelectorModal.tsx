import React from 'react';
import type { ThemeDefinition } from '../../types/readme';
import { ModalShell, ConsoleBadge } from '../ui/primitives';

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
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Select Theme" eyebrow="THEME · SIGNAL FEED" maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map((theme) => {
          const isSelected = theme.themeKey === currentThemeId;
          return (
            <div
              key={theme.themeId}
              onClick={() => {
                onSelectTheme(theme.themeKey);
                onClose();
              }}
              className={`group rounded-panel border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-signal-500/10 border-signal-500'
                  : 'bg-carbon-800 hover:bg-carbon-750 border-console-600 hover:border-console-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className={`font-mono text-xs font-bold ${isSelected ? 'text-signal-400' : 'text-console-100 group-hover:text-signal-400'} transition-colors`}>
                    {theme.name}
                  </h3>
                  {isSelected && (
                    <ConsoleBadge tone="accent">Active</ConsoleBadge>
                  )}
                </div>
                <p className="font-mono text-xs text-console-400 mb-4">{theme.description}</p>
              </div>

              {/* Color Palette Swatches */}
              <div className="pt-3 border-t border-console-700 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-tick border border-carbon-950/20 shadow-sm"
                    style={{ backgroundColor: theme.palette.primary }}
                    title="Primary"
                  />
                  <span
                    className="w-4 h-4 rounded-tick border border-carbon-950/20 shadow-sm"
                    style={{ backgroundColor: theme.palette.accent }}
                    title="Accent"
                  />
                  <span
                    className="w-4 h-4 rounded-tick border border-carbon-950/20 shadow-sm"
                    style={{ backgroundColor: theme.palette.background }}
                    title="Background"
                  />
                  <span
                    className="w-4 h-4 rounded-tick border border-carbon-950/20 shadow-sm"
                    style={{ backgroundColor: theme.palette.text }}
                    title="Text"
                  />
                </div>
                <span className="font-mono text-[10px] text-console-500 ml-auto">
                  {theme.style.tableStyle} table
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};
