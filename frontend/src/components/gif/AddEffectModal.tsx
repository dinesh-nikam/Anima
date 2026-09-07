import React, { useState, useEffect } from 'react';
import type { EffectMetadata, EffectCategory } from '../../types/gif';
import { gifApi } from '../../api/gifClient';
import { ModalShell, ConsoleBadge, ConsoleButton, TickLabel } from '../ui/primitives';

interface AddEffectModalProps {
  isOpen: boolean;
  activeEffectIds: string[];
  onClose: () => void;
  onSelectEffect: (effect: EffectMetadata) => void;
}

const CATEGORIES: Array<{ key: EffectCategory | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'CAMERA', label: 'Camera' },
  { key: 'LIGHTING', label: 'Lighting' },
  { key: 'ATMOSPHERE', label: 'Atmosphere' },
  { key: 'RETRO', label: 'Retro' },
  { key: 'GLITCH', label: 'Glitch' },
  { key: 'MOTION', label: 'Motion' },
  { key: 'DISTORTION', label: 'Distortion' },
  { key: 'COLOR', label: 'Color' },
  { key: 'PIXEL_ART', label: 'Pixel Art' },
];

export const AddEffectModal: React.FC<AddEffectModalProps> = ({
  isOpen,
  activeEffectIds,
  onClose,
  onSelectEffect,
}) => {
  const [effects, setEffects] = useState<EffectMetadata[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    gifApi
      .listEffects()
      .then((data) => setEffects(data))
      .catch((err) => console.error('Failed to load effects catalog:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = effects.filter((eff) => {
    const matchesCat = selectedCategory === 'ALL' || eff.category === selectedCategory;
    const matchesSearch =
      eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eff.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="EFFECT CATALOG — 31 EFFECTS" eyebrow="35 EFFECTS · PROCEDURAL">
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Search effects by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-tick bg-carbon-800 border border-console-600 text-console-100 font-mono text-xs outline-none focus:border-signal-600 placeholder:text-console-500"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`gif-overlay-btn whitespace-nowrap ${selectedCategory === cat.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-6 w-[2px] bg-signal-500/60 animate-pulse mb-3" aria-hidden="true" />
              <TickLabel>LOADING CATALOG…</TickLabel>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center font-mono text-xs text-console-400">
              No matching effects found.
            </div>
          ) : (
            filtered.map((eff) => {
              const isAlreadyActive = activeEffectIds.includes(eff.id);
              return (
                <div
                  key={eff.id}
                  className="bg-carbon-800 border border-console-700 rounded-panel p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-display font-bold text-xs text-console-100">{eff.name}</span>
                      <ConsoleBadge>{eff.category}</ConsoleBadge>
                      <ConsoleBadge tone={eff.performanceCost === 'LOW' ? 'accent' : eff.performanceCost === 'MEDIUM' ? 'hazard' : 'default'}>
                        {eff.performanceCost} COST
                      </ConsoleBadge>
                    </div>
                    <div className="font-mono text-xs text-console-300 leading-relaxed">
                      {eff.description}
                    </div>
                  </div>

                  <ConsoleButton
                    variant={isAlreadyActive ? 'secondary' : 'primary'}
                    disabled={isAlreadyActive}
                    onClick={() => onSelectEffect(eff)}
                    className="shrink-0 text-[11px] py-1.5 px-3"
                  >
                    {isAlreadyActive ? 'ADDED' : '+ ADD'}
                  </ConsoleButton>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModalShell>
  );
};
