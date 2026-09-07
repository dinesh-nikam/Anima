import type { TemplateSummary } from '../../types/readme';
import { TemplateCard } from './TemplateCard';

export interface TemplateGalleryProps {
  templates: TemplateSummary[];
  loading?: boolean;
  onSelect?: (templateKey: string) => void;
}

export function TemplateGallery({ templates, loading, onSelect }: TemplateGalleryProps) {
  if (loading) {
    return (
      <div className="rounded-panel border border-dashed border-console-600 p-6 text-center font-mono text-sm text-console-500 bg-carbon-850">
        Loading templates…
      </div>
    );
  }
  if (templates.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-console-600 p-6 text-center font-mono text-sm text-console-500 bg-carbon-850">
        No templates available.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <TemplateCard key={t.templateKey} template={t} onSelect={onSelect} />
      ))}
    </div>
  );
}
