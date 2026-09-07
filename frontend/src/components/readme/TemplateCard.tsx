import type { TemplateSummary } from '../../types/readme';
import { ConsoleBadge } from '../ui/primitives';

export interface TemplateCardProps {
  template: TemplateSummary;
  onSelect?: (templateKey: string) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(template.templateKey)}
      className="group flex w-full flex-col instrument-panel p-4 text-left hover:border-signal-600/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-xs font-bold text-console-100 group-hover:text-signal-400">{template.name}</h3>
        <ConsoleBadge tone={template.status === 'PUBLISHED' ? 'accent' : template.status === 'DRAFT' ? 'hazard' : 'default'}>
          {template.status}
        </ConsoleBadge>
      </div>
      <p className="mt-2 font-mono text-xs text-console-400">{template.description}</p>
      <div className="mt-3 flex items-center justify-between font-mono text-xs text-console-500">
        <span>{template.sectionCount} sections</span>
        <span>v{template.version}</span>
      </div>
    </button>
  );
}
