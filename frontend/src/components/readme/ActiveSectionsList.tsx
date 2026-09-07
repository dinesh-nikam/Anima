import React from 'react';
import type { ReadmeSectionInstance, ComponentDefinition } from '../../types/readme';
import { ConsoleBadge, ConsoleButton, ConsoleIconButton } from '../ui/primitives';

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

  const getCategoryTone = (_category?: string): 'default' | 'accent' | 'hazard' => {
    // Keep single accent language — categories as default badge, selected gets accent
    return 'default';
  };

  return (
    <div className="flex flex-col h-full bg-carbon-900">
      {/* Header */}
      <div className="p-4 border-b border-console-700 flex items-center justify-between">
        <div>
          <p className="tick-label">SECTIONS</p>
          <p className="font-mono text-[11px] text-console-400">{sections.length} sections in draft</p>
        </div>
        <ConsoleButton variant="primary" onClick={onOpenLibrary}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add</span>
        </ConsoleButton>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sections.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-console-700 rounded-panel bg-carbon-850">
            <div className="w-10 h-10 mx-auto bg-carbon-800 border border-console-600 flex items-center justify-center text-console-500 mb-3 rounded-tick">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-console-100">No sections added</p>
            <p className="font-mono text-[11px] text-console-500 mt-1">Add components to assemble your README</p>
            <ConsoleButton variant="secondary" onClick={onOpenLibrary} className="mt-4">
              Browse Library
            </ConsoleButton>
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
                className={`group relative border p-3 transition-all cursor-pointer rounded-panel ${
                  isSelected
                    ? 'bg-signal-500/10 border-signal-500/60'
                    : 'bg-carbon-800/60 hover:bg-carbon-800 border-console-700 hover:border-console-600'
                } ${!section.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Reorder handles & Title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex flex-col gap-0.5 text-console-500">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(section.id, 'up');
                        }}
                        disabled={index === 0}
                        className="p-0.5 rounded-tick hover:text-signal-400 disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                        aria-label="Move section up"
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
                        className="p-0.5 rounded-tick hover:text-signal-400 disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                        aria-label="Move section down"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-signal-400' : 'text-console-100'}`}>
                          {def?.name || section.componentKey}
                        </span>
                        <ConsoleBadge tone={getCategoryTone(category)}>
                          {category || 'custom'}
                        </ConsoleBadge>
                      </div>
                      <p className="font-mono text-[11px] text-console-400 truncate mt-0.5">
                        {def?.description || 'Custom component'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Enable / Disable toggle */}
                    <ConsoleIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleEnabled(section.id);
                      }}
                      title={section.enabled ? 'Disable section' : 'Enable section'}
                      aria-label={section.enabled ? 'Disable section' : 'Enable section'}
                    >
                      {section.enabled ? (
                        <svg className="w-4 h-4 text-signal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </ConsoleIconButton>

                    {/* Duplicate */}
                    <ConsoleIconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSection(section.id);
                      }}
                      title="Duplicate section"
                      aria-label="Duplicate section"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </ConsoleIconButton>

                    {/* Delete */}
                    <ConsoleIconButton
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(section.id);
                      }}
                      title="Delete section"
                      aria-label="Delete section"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </ConsoleIconButton>
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
