import type { ThemeSummary } from '../../types/readme';

export interface ThemeCardProps {
  theme: ThemeSummary;
  selected?: boolean;
  onSelect?: (themeKey: string) => void;
}

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  const border = selected ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-400';
  return (
    <button
      type="button"
      onClick={() => onSelect?.(theme.themeKey)}
      className={`flex w-full flex-col rounded-lg border bg-white p-4 text-left transition ${border}`}
    >
      <h3 className="font-semibold text-zinc-900">{theme.name}</h3>
      <p className="mt-1 text-sm text-zinc-600">{theme.description}</p>
      <div className="mt-3 text-xs text-zinc-500">v{theme.version}</div>
    </button>
  );
}
