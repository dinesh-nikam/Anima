import React from 'react';
import type { ReadmeSectionInstance, ComponentDefinition } from '../../types/readme';

interface ActiveSectionsListProps {
  sections: ReadmeSectionInstance[];
  components: ComponentDefinition[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onToggleEnabled: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
  onDuplicateSection: (sectionId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onOpenLibrary: () => void;
}

export const ActiveSectionsList: React.FC<ActiveSectionsListProps> = ({
  sections,
  components,
  selectedSectionId,
  onSelectSection,
  onToggleEnabled,
  onMoveSection,
  onDuplicateSection,
  onRemoveSection,
  onOpenLibrary,
}) => {
  const getComponentDef = (componentKey: string) => {
    return components.find((c) => c.id === componentKey);
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'profile':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'github-statistics':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'achievements':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'presentation':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'community':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sections</h2>
          <p className="text-xs text-slate-400">{sections.length} sections in draft</p>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Section</span>
        </button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sections.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-300">No sections added</p>
            <p className="text-xs text-slate-500 mt-1">Add components to assemble your README</p>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              Browse Library
            </button>
          </div>
        ) : (
          sections.map((section, index) => {
            const def = getComponentDef(section.componentKey);
            const isSelected = selectedSectionId === section.id;
            const category = def?.category;

            return (
              <div
                key={section.id}
                onClick={() => onSelectSection(section.id)}
                className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/50'
                    : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800/80'
                } ${!section.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Reorder handles & Title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex flex-col gap-0.5 text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(section.id, 'up');
                        }}
                        disabled={index === 0}
                        className="p-0.5 rounded hover:text-white disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(section.id, 'down');
                        }}
                        disabled={index === sections.length - 1}
                        className="p-0.5 rounded hover:text-white disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {def?.name || section.componentKey}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${getCategoryColor(category)}`}>
                          {category || 'custom'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {def?.description || 'Custom component'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Enable / Disable toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleEnabled(section.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        section.enabled
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-slate-500 hover:bg-slate-700'
                      }`}
                      title={section.enabled ? 'Disable section' : 'Enable section'}
                    >
                      {section.enabled ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSection(section.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Duplicate section"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(section.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete section"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
