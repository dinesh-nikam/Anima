import type { ThemeSummary } from '../../types/readme';
import { ConsoleBadge } from '../ui/primitives';

export interface ThemeCardProps {
  theme: ThemeSummary;
  selected?: boolean;
  onSelect?: (themeKey: string) => void;
}

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(theme.themeKey)}
      className={`flex w-full flex-col p-4 text-left transition instrument-panel ${
        selected ? 'border-signal-500 bg-signal-500/10' : 'hover:border-signal-600/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-mono text-xs font-bold ${selected ? 'text-signal-400' : 'text-console-100'}`}>{theme.name}</h3>
        {selected && <ConsoleBadge tone="accent">Selected</ConsoleBadge>}
      </div>
      <p className="mt-1 font-mono text-xs text-console-400">{theme.description}</p>
      <div className="mt-3 font-mono text-xs text-console-500">v{theme.version}</div>
    </button>
  );
}
