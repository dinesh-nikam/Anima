import React, { useState, useMemo } from 'react';
import type { ComponentDefinition } from '../../types/readme';
import { ConsoleBadge, ConsoleButton } from '../ui/primitives';

interface SectionLibraryProps {
  components: ComponentDefinition[];
  onAddComponent: (componentKey: string) => void;
  onClose?: () => void;
}

export const SectionLibrary: React.FC<SectionLibraryProps> = ({
  components,
  onAddComponent,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(components.map((c) => c.category));
    return ['all', ...Array.from(cats)];
  }, [components]);

  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [components, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col h-full bg-carbon-900">
      {/* Header */}
      <div className="p-4 border-b border-console-700 flex items-center justify-between">
        <div>
          <p className="tick-label">ADD COMPONENTS</p>
          <p className="font-mono text-xs text-console-400">Add verified components to your README</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-tick text-console-400 hover:text-console-100 hover:bg-carbon-800 border border-transparent hover:border-console-600 transition-colors cursor-pointer"
            aria-label="Close library"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search & Categories */}
      <div className="p-4 border-b border-console-700 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <svg className="w-4 h-4 text-console-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-carbon-800 text-console-100 font-mono text-xs pl-9 pr-3 py-2 rounded-tick border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-signal-500 text-carbon-950 border-signal-500'
                  : 'bg-carbon-800 hover:bg-carbon-750 text-console-300 border-console-600 hover:border-console-500'
              }`}
            >
              {cat === 'all' ? 'All Components' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Components Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-12 font-mono text-xs text-console-500 border border-dashed border-console-700 rounded-panel bg-carbon-850">
            No components match your search query.
          </div>
        ) : (
          filteredComponents.map((comp) => (
            <div
              key={comp.id}
              className="bg-carbon-800 hover:bg-carbon-750 border border-console-600 hover:border-console-500 rounded-panel p-4 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-mono text-xs font-bold text-console-100 group-hover:text-signal-400 transition-colors">
                    {comp.name}
                  </h3>
                  <ConsoleBadge>{comp.category}</ConsoleBadge>
                </div>
                <p className="font-mono text-xs text-console-400 mb-3">{comp.description}</p>

                {comp.requiredData.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {comp.requiredData.map((d) => (
                      <ConsoleBadge key={d}>{d}</ConsoleBadge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-console-700">
                <span className="font-mono text-[10px] text-console-500">
                  {comp.settings.length} setting{comp.settings.length === 1 ? '' : 's'}
                </span>
                <ConsoleButton variant="primary" onClick={() => onAddComponent(comp.id)}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add to README</span>
                </ConsoleButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
