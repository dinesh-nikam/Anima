import type { ComponentSummary } from '../../types/readme';

export interface ComponentCardProps {
  component: ComponentSummary;
}

export function ComponentCard({ component }: ComponentCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">{component.name}</h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
          {component.category}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">{component.description}</p>
      <div className="mt-3 text-xs text-zinc-500">
        <div>ID: <code className="font-mono">{component.id}</code></div>
        <div>Version: v{component.version}</div>
        {component.requiredData.length > 0 && (
          <div className="mt-1">
            Requires: {component.requiredData.map((d: string) => (
              <code key={d} className="mr-1 rounded bg-zinc-100 px-1 font-mono">{d}</code>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
