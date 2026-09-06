import type { TemplateSummary } from '../../types/readme';

export interface TemplateCardProps {
  template: TemplateSummary;
  onSelect?: (templateKey: string) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const statusColor: Record<TemplateSummary['status'], string> = {
    PUBLISHED: 'bg-emerald-100 text-emerald-800',
    DRAFT: 'bg-amber-100 text-amber-800',
    DEPRECATED: 'bg-zinc-100 text-zinc-700',
    DISABLED: 'bg-red-100 text-red-700',
  };
  return (
    <button
      type="button"
      onClick={() => onSelect?.(template.templateKey)}
      className="group flex w-full flex-col rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-400 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">{template.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[template.status]}`}>
          {template.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{template.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{template.sectionCount} sections</span>
        <span>v{template.version}</span>
      </div>
    </button>
  );
}
