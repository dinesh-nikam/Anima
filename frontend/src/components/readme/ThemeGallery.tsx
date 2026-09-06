import type { ThemeSummary } from '../../types/readme';
import { ThemeCard } from './ThemeCard';

export interface ThemeGalleryProps {
  themes: ThemeSummary[];
  loading?: boolean;
  selectedThemeKey?: string;
  onSelect?: (themeKey: string) => void;
}

export function ThemeGallery({ themes, loading, selectedThemeKey, onSelect }: ThemeGalleryProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        Loading themes…
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {themes.map((t) => (
        <ThemeCard
          key={t.themeKey}
          theme={t}
          selected={t.themeKey === selectedThemeKey}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
