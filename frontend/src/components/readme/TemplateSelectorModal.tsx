import React, { useState } from 'react';
import type { TemplateDefinition } from '../../types/readme';

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

  if (!isOpen) return null;

  const handleApply = () => {
    if (!selectedTemplateKey) return;
    onApplyTemplate(selectedTemplateKey, applyMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Apply README Template</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a curated template layout to structure your profile README
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const isSelected = selectedTemplateKey === tpl.templateKey;
            const isCurrent = currentTemplateId === tpl.templateKey;

            return (
              <div
                key={tpl.templateKey}
                onClick={() => setSelectedTemplateKey(tpl.templateKey)}
                className={`group rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {tpl.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{tpl.description}</p>

                  {/* Sections list preview */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Included Sections ({tpl.sections.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tpl.sections.map((s) => (
                        <span
                          key={s.sectionKey}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                        >
                          {s.componentKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Default Theme: <strong className="text-indigo-400">{tpl.themeKey}</strong></span>
                  <span className="font-mono text-[10px] text-slate-500">v{tpl.version}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Apply Mode & Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Apply Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                value="REPLACE"
                checked={applyMode === 'REPLACE'}
                onChange={() => setApplyMode('REPLACE')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>Replace All Sections</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="applyMode"
                value="MERGE"
                checked={applyMode === 'MERGE'}
                onChange={() => setApplyMode('MERGE')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>Merge Missing Sections</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!selectedTemplateKey}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
