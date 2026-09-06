import React, { useState, useMemo } from 'react';
import type { ComponentDefinition } from '../../types/readme';

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
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Component Library</h2>
          <p className="text-xs text-slate-400">Add verified components to your README</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search & Categories */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
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
          <div className="text-center py-12 text-slate-500 text-xs">
            No components match your search query.
          </div>
        ) : (
          filteredComponents.map((comp) => (
            <div
              key={comp.id}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-xl p-4 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {comp.name}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getCategoryColor(comp.category)}`}>
                    {comp.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{comp.description}</p>

                {comp.requiredData.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {comp.requiredData.map((d) => (
                      <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                <span className="text-[10px] text-slate-500 font-mono">
                  {comp.settings.length} setting{comp.settings.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => onAddComponent(comp.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add to README</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
