import React from 'react';
import type { AnimationEffectInstance } from '../../types/gif';

interface EffectListPanelProps {
  effects: AnimationEffectInstance[];
  onToggleLock: (id: string) => void;
  onToggleEnable: (id: string) => void;
  onUpdateIntensity: (id: string, intensity: number) => void;
  onUpdateSpeed: (id: string, speed: number) => void;
  onRemoveEffect: (id: string) => void;
  onOpenAddModal: () => void;
}

export const EffectListPanel: React.FC<EffectListPanelProps> = ({
  effects,
  onToggleLock,
  onToggleEnable,
  onUpdateIntensity,
  onUpdateSpeed,
  onRemoveEffect,
  onOpenAddModal,
}) => {
  return (
    <div className="gif-panel right">
      <div className="gif-panel-header">
        <span>ACTIVE EFFECTS ({effects.length})</span>
        <button
          type="button"
          onClick={onOpenAddModal}
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            color: 'var(--gif-accent-purple)',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          + ADD EFFECT
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {effects.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--gif-text-muted)', fontSize: 13 }}>
            No effects applied yet. Click <strong style={{ color: 'var(--gif-accent-pink)' }}>RANDOMIZE</strong> or add one above!
          </div>
        ) : (
          effects.map((eff) => (
            <div
              key={eff.id}
              className={`gif-effect-card ${eff.locked ? 'locked' : ''}`}
            >
              <div className="gif-card-top-row">
                <div className="gif-card-title-group">
                  <input
                    type="checkbox"
                    checked={eff.enabled}
                    onChange={() => onToggleEnable(eff.id)}
                    title={eff.enabled ? 'Disable Effect' : 'Enable Effect'}
                    style={{ cursor: 'pointer', accentColor: 'var(--gif-accent-purple)' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{eff.name}</div>
                    <span className="gif-category-tag">{eff.category}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Pin / Lock Toggle */}
                  <button
                    type="button"
                    className={`gif-lock-btn ${eff.locked ? 'active' : ''}`}
                    onClick={() => onToggleLock(eff.id)}
                    title={eff.locked ? 'Effect Locked (Preserved during Randomize)' : 'Lock Effect'}
                  >
                    {eff.locked ? '🔒' : '🔓'}
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    className="gif-lock-btn"
                    onClick={() => onRemoveEffect(eff.id)}
                    title="Remove Effect"
                    style={{ color: '#ef4444' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Intensity Slider */}
              <div className="gif-slider-group">
                <div className="gif-slider-label">
                  <span>Intensity</span>
                  <span style={{ fontWeight: 700 }}>{Math.round((eff.intensity ?? 0.5) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.01"
                  value={eff.intensity ?? 0.5}
                  onChange={(e) => onUpdateIntensity(eff.id, parseFloat(e.target.value))}
                  className="gif-range-input"
                />
              </div>

              {/* Speed Multiplier Slider */}
              <div className="gif-slider-group">
                <div className="gif-slider-label">
                  <span>Speed</span>
                  <span style={{ fontWeight: 700 }}>{(eff.speed ?? 1.0).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="3.0"
                  step="0.05"
                  value={eff.speed ?? 1.0}
                  onChange={(e) => onUpdateSpeed(eff.id, parseFloat(e.target.value))}
                  className="gif-range-input"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
