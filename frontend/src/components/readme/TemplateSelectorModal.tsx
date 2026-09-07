import React, { useState } from 'react';
import type { TemplateDefinition } from '../../types/readme';
import { ModalShell, ConsoleBadge, ConsoleButton } from '../ui/primitives';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  templates: TemplateDefinition[];
  currentTemplateId: string | null;
  onApplyTemplate: (templateKey: string, mode: 'REPLACE' | 'MERGE') => void;
  onClose: () => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  templates,
  currentTemplateId,
  onApplyTemplate,
  onClose,
}) => {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');

  const handleApply = () => {
    if (!selectedTemplateKey) return;
    onApplyTemplate(selectedTemplateKey, applyMode);
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Apply README Template" eyebrow="TEMPLATE · SIGNAL FEED" maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((tpl) => {
            const isSelected = selectedTemplateKey === tpl.templateKey;
            const isCurrent = currentTemplateId === tpl.templateKey;

            return (
              <div
                key={tpl.templateKey}
                onClick={() => setSelectedTemplateKey(tpl.templateKey)}
                className={`group rounded-panel border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-signal-500/10 border-signal-500'
                    : 'bg-carbon-800 hover:bg-carbon-750 border-console-600 hover:border-console-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className={`font-mono text-xs font-bold ${isSelected ? 'text-signal-400' : 'text-console-100 group-hover:text-signal-400'} transition-colors`}>
                      {tpl.name}
                    </h3>
                    {isCurrent && (
                      <ConsoleBadge tone="accent">Current</ConsoleBadge>
                    )}
                  </div>
                  <p className="font-mono text-xs text-console-400 mb-3">{tpl.description}</p>

                  {/* Sections list preview */}
                  <div className="space-y-1 mb-3">
                    <span className="tick-label block">
                      Included Sections ({tpl.sections.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tpl.sections.map((s) => (
                        <ConsoleBadge key={s.sectionKey}>{s.componentKey}</ConsoleBadge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-console-700 flex items-center justify-between font-mono text-[11px] text-console-400">
                  <span>Default Theme: <strong className="text-signal-400">{tpl.themeKey}</strong></span>
                  <span className="text-console-500">v{tpl.version}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Apply Mode & Actions */}
        <div className="pt-4 border-t border-console-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 font-mono text-xs text-console-300">
            <span className="tick-label">Apply Mode</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                value="REPLACE"
                checked={applyMode === 'REPLACE'}
                onChange={() => setApplyMode('REPLACE')}
                className="accent-signal-500"
              />
              <span>Replace All</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                value="MERGE"
                checked={applyMode === 'MERGE'}
                onChange={() => setApplyMode('MERGE')}
                className="accent-signal-500"
              />
              <span>Merge Missing</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <ConsoleButton variant="secondary" onClick={onClose}>
              Cancel
            </ConsoleButton>
            <ConsoleButton variant="primary" onClick={handleApply} disabled={!selectedTemplateKey}>
              Apply Template
            </ConsoleButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
