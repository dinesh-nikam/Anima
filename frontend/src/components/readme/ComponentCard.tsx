import type { ComponentSummary } from '../../types/readme';
import { ConsoleBadge } from '../ui/primitives';

export interface ComponentCardProps {
  component: ComponentSummary;
}

export function ComponentCard({ component }: ComponentCardProps) {
  return (
    <div className="flex flex-col instrument-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-xs font-bold text-console-100">{component.name}</h3>
        <ConsoleBadge>{component.category}</ConsoleBadge>
      </div>
      <p className="mt-1 font-mono text-xs text-console-400">{component.description}</p>
      <div className="mt-3 font-mono text-xs text-console-500 space-y-1">
        <div>ID: <code className="text-console-300">{component.id}</code></div>
        <div>Version: v{component.version}</div>
        {component.requiredData.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            Requires: {component.requiredData.map((d: string) => (
              <ConsoleBadge key={d}>{d}</ConsoleBadge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
