import React, { useState, useEffect } from 'react';
import type { EffectMetadata, EffectCategory } from '../../types/gif';
import { gifApi } from '../../api/gifClient';

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
    <div className="gif-modal-backdrop" onClick={onClose}>
      <div className="gif-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--gif-border)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>EFFECT CATALOG (31 EFFECTS)</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gif-text-secondary)',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search & Category Filter */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gif-border)' }}>
          <input
            type="text"
            placeholder="Search effects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--gif-bg-elevated)',
              border: '1px solid var(--gif-border)',
              color: '#ffffff',
              fontSize: 13,
              outline: 'none',
              marginBottom: 10,
            }}
          />

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`gif-overlay-btn ${selectedCategory === cat.key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.key)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Effect Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gif-text-muted)' }}>
              Loading catalog...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gif-text-muted)' }}>
              No matching effects found.
            </div>
          ) : (
            filtered.map((eff) => {
              const isAlreadyActive = activeEffectIds.includes(eff.id);
              return (
                <div
                  key={eff.id}
                  style={{
                    background: 'var(--gif-bg-elevated)',
                    border: '1px solid var(--gif-border)',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{eff.name}</span>
                      <span className="gif-category-tag">{eff.category}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background:
                            eff.performanceCost === 'LOW'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : eff.performanceCost === 'MEDIUM'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            eff.performanceCost === 'LOW'
                              ? 'var(--gif-accent-emerald)'
                              : eff.performanceCost === 'MEDIUM'
                              ? 'var(--gif-accent-amber)'
                              : '#ef4444',
                        }}
                      >
                        {eff.performanceCost} COST
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gif-text-secondary)', lineHeight: 1.4 }}>
                      {eff.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAlreadyActive}
                    onClick={() => onSelectEffect(eff)}
                    style={{
                      background: isAlreadyActive
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'var(--gif-accent-purple)',
                      border: 'none',
                      color: isAlreadyActive ? 'var(--gif-text-muted)' : '#ffffff',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isAlreadyActive ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isAlreadyActive ? 'ADDED' : '+ ADD'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
