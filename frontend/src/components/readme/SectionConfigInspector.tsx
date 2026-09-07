import React, { useState, useEffect } from 'react';
import type { ReadmeSectionInstance, ComponentDefinition, SettingDefinition, ProviderDefinition } from '../../types/readme';
import { readmeApi } from '../../services/readmeApi';
import { ConsoleBadge } from '../ui/primitives';

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
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-carbon-900">
        <div className="w-10 h-10 bg-carbon-800 border border-console-600 flex items-center justify-center text-console-500 mb-3 rounded-tick">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <p className="tick-label">NO SECTION SELECTED</p>
        <p className="font-mono text-xs text-console-500 mt-1 max-w-xs">
          Select a section from the list to customize its layout, styling, dynamic provider, and data fields.
        </p>
      </div>
    );
  }

  const currentSettings = (section.configuration || {}) as Record<string, unknown>;
  const activeProviderKey = (currentSettings['provider'] as string) || componentDef.defaultProvider;
  const activeProvider = providers.find((p) => p.providerKey === activeProviderKey);

  const handleFieldChange = (fieldName: string, value: unknown) => {
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
          <div key={field.name} className="flex items-center justify-between py-2 border-b border-console-700/60">
            <div>
              <label className="font-mono text-xs font-semibold text-console-200 block">{field.name}</label>
              {field.description && <p className="font-mono text-[11px] text-console-400 mt-0.5">{field.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => handleFieldChange(field.name, !value)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-tick border border-console-600 transition-colors duration-200 ease-in-out focus:outline-none ${
                value ? 'bg-signal-500 border-signal-500' : 'bg-carbon-800'
              }`}
              aria-label={`Toggle ${field.name}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform bg-carbon-950 shadow ring-0 transition duration-200 ease-in-out rounded-tick ${
                  value ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );

      case 'enum':
        return (
          <div key={field.name} className="py-2 border-b border-console-700/60">
            <label className="font-mono text-xs font-semibold text-console-200 block mb-1">{field.name}</label>
            {field.description && <p className="font-mono text-[11px] text-console-400 mb-1.5">{field.description}</p>}
            <select
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full bg-carbon-800 text-console-100 font-mono text-xs rounded-tick px-3 py-2 border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500 cursor-pointer"
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
          <div key={field.name} className="py-2 border-b border-console-700/60">
            <label className="font-mono text-xs font-semibold text-console-200 block mb-1">{field.name}</label>
            {field.description && <p className="font-mono text-[11px] text-console-400 mb-1.5">{field.description}</p>}
            <input
              type="number"
              value={value !== undefined ? Number(value as number) : ''}
              onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
              className="w-full bg-carbon-800 text-console-100 font-mono text-xs rounded-tick px-3 py-2 border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
          </div>
        );

      case 'string':
      default:
        return (
          <div key={field.name} className="py-2 border-b border-console-700/60">
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-xs font-semibold text-console-200">{field.name}</label>
              {field.maxLength && (
                <span className="font-mono text-[10px] text-console-500">max {field.maxLength}</span>
              )}
            </div>
            {field.description && <p className="font-mono text-[11px] text-console-400 mb-1.5">{field.description}</p>}
            <input
              type="text"
              value={String(value || '')}
              maxLength={field.maxLength}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}...`}
              className="w-full bg-carbon-800 text-console-100 font-mono text-xs rounded-tick px-3 py-2 border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-carbon-900">
      {/* Header */}
      <div className="p-4 border-b border-console-700">
        <div className="flex items-center justify-between">
          <p className="tick-label">CONFIGURE</p>
          <ConsoleBadge tone="accent">v{componentDef.version}</ConsoleBadge>
        </div>
        <p className="font-mono text-xs font-bold text-signal-400 mt-1">{componentDef.name}</p>
        <p className="font-mono text-xs text-console-400 mt-0.5">{componentDef.description}</p>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="mx-4 mt-4 p-3 rounded-tick bg-alert-500/10 border border-alert-500/30 text-alert-400 text-xs flex items-start gap-2">
          <svg className="w-4 h-4 text-alert-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-mono font-bold uppercase tracking-wide">Configuration Error</p>
            <p className="mt-0.5 text-alert-400/80 font-mono">{validationError}</p>
          </div>
        </div>
      )}

      {/* Dynamic Provider Info Banner */}
      {loadingProviders ? (
        <div className="mx-4 mt-3 p-2 rounded-tick bg-carbon-800 border border-console-600 font-mono text-[11px] text-console-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-signal-500 animate-pulse rounded-tick" />
          Loading provider metadata…
        </div>
      ) : activeProvider ? (
        <div className="mx-4 mt-3 p-3 rounded-tick bg-signal-500/10 border border-signal-500/30">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-xs text-signal-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-tick ${activeProvider.status === 'ENABLED' ? 'bg-signal-500' : 'bg-hazard-400'}`} />
              Provider: {activeProvider.name}
            </span>
            <ConsoleBadge>{activeProvider.category}</ConsoleBadge>
          </div>
          <p className="font-mono text-[11px] text-console-400 mt-1">{activeProvider.description}</p>
          {activeProvider.capabilities && activeProvider.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {activeProvider.capabilities.map((cap) => (
                <ConsoleBadge key={cap} tone="accent">
                  {cap}
                </ConsoleBadge>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {componentDef.settings.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs text-console-500">
            This component has no configurable options.
          </div>
        ) : (
          componentDef.settings.map((field) => renderField(field))
        )}

        {/* Required Data Indicators */}
        {componentDef.requiredData.length > 0 && (
          <div className="pt-4 border-t border-console-700">
            <p className="tick-label mb-2">Data Dependencies</p>
            <div className="flex flex-wrap gap-1.5">
              {componentDef.requiredData.map((dep) => (
                <ConsoleBadge key={dep}>{dep}</ConsoleBadge>
              ))}
            </div>
            <p className="font-mono text-[10px] text-console-500 mt-1.5">
              Populated automatically from verified GitHub analytics and profile sync.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
