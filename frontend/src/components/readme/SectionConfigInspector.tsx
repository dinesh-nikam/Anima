import React, { useState, useEffect } from 'react';
import type { ReadmeSectionInstance, ComponentDefinition, SettingDefinition, ProviderDefinition } from '../../types/readme';
import { readmeApi } from '../../services/readmeApi';

interface SectionConfigInspectorProps {
  section: ReadmeSectionInstance | null;
  componentDef: ComponentDefinition | null;
  onUpdateConfig: (sectionId: string, newConfig: Record<string, unknown>) => void;
  validationError?: string;
}

export const SectionConfigInspector: React.FC<SectionConfigInspectorProps> = ({
  section,
  componentDef,
  onUpdateConfig,
  validationError,
}) => {
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const compId = componentDef?.id;
    const supported = componentDef?.supportedProviders;

    if (compId && supported && supported.length > 0) {
      setLoadingProviders(true);
      readmeApi
        .getProviders({ component: compId, includeDisabled: true })
        .then((res) => {
          if (!isCancelled) setProviders(res);
        })
        .catch(() => {
          if (!isCancelled) setProviders([]);
        })
        .finally(() => {
          if (!isCancelled) setLoadingProviders(false);
        });
    } else {
      setProviders([]);
      setLoadingProviders(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [componentDef?.id, componentDef?.supportedProviders]);

  if (!section || !componentDef) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900/50 border-r border-slate-800">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-300">No Section Selected</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select a section from the list to customize its layout, styling, dynamic provider, and data fields.
        </p>
      </div>
    );
  }

  const currentSettings = (section.configuration || {}) as Record<string, any>;
  const activeProviderKey = currentSettings['provider'] || componentDef.defaultProvider;
  const activeProvider = providers.find((p) => p.providerKey === activeProviderKey);

  const handleFieldChange = (fieldName: string, value: any) => {
    onUpdateConfig(section.id, {
      ...currentSettings,
      [fieldName]: value,
    });
  };

  const renderField = (field: SettingDefinition) => {
    const value = currentSettings[field.name] !== undefined ? currentSettings[field.name] : field.default;

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.name} className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <div>
              <label className="text-xs font-semibold text-slate-200 block">{field.name}</label>
              {field.description && <p className="text-[11px] text-slate-400 mt-0.5">{field.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => handleFieldChange(field.name, !value)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                value ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  value ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );

      case 'enum':
        return (
          <div key={field.name} className="py-2 border-b border-slate-800/60">
            <label className="text-xs font-semibold text-slate-200 block mb-1">{field.name}</label>
            {field.description && <p className="text-[11px] text-slate-400 mb-1.5">{field.description}</p>}
            <select
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {(field.enumValues || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="py-2 border-b border-slate-800/60">
            <label className="text-xs font-semibold text-slate-200 block mb-1">{field.name}</label>
            {field.description && <p className="text-[11px] text-slate-400 mb-1.5">{field.description}</p>}
            <input
              type="number"
              value={value !== undefined ? Number(value) : ''}
              onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
              className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        );

      case 'string':
      default:
        return (
          <div key={field.name} className="py-2 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-200">{field.name}</label>
              {field.maxLength && (
                <span className="text-[10px] text-slate-500 font-mono">max {field.maxLength}</span>
              )}
            </div>
            {field.description && <p className="text-[11px] text-slate-400 mb-1.5">{field.description}</p>}
            <input
              type="text"
              value={String(value || '')}
              maxLength={field.maxLength}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}...`}
              className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Configure Section</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            v{componentDef.version}
          </span>
        </div>
        <p className="text-xs font-semibold text-indigo-400 mt-1">{componentDef.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{componentDef.description}</p>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Configuration Error</p>
            <p className="mt-0.5 text-rose-300/80">{validationError}</p>
          </div>
        </div>
      )}

      {/* Dynamic Provider Info Banner */}
      {loadingProviders ? (
        <div className="mx-4 mt-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Loading provider metadata...
        </div>
      ) : activeProvider ? (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeProvider.status === 'ENABLED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              Provider: {activeProvider.name}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {activeProvider.category}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{activeProvider.description}</p>
          {activeProvider.capabilities && activeProvider.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeProvider.capabilities.map((cap) => (
                <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {componentDef.settings.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            This component has no configurable options.
          </div>
        ) : (
          componentDef.settings.map((field) => renderField(field))
        )}

        {/* Required Data Indicators */}
        {componentDef.requiredData.length > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Data Dependencies
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {componentDef.requiredData.map((dep) => (
                <span
                  key={dep}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  {dep}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Populated automatically from verified GitHub analytics and profile sync.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
