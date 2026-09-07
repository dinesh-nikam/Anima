import React from 'react';
import type { AnimationEffectInstance } from '../../types/gif';
import { ConsoleButton, ConsoleBadge, TickLabel, TickDivider } from '../ui/primitives';

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
    <div className="gif-panel right flex flex-col h-full">
      <div className="gif-panel-header">
        <TickLabel>EFFECT STACK — {effects.length}</TickLabel>
        <ConsoleButton variant="secondary" onClick={onOpenAddModal} className="py-1 px-2 text-[10px]">
          + ADD EFFECT
        </ConsoleButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        {effects.length === 0 ? (
          <div className="p-6 text-center">
            <TickLabel>NO EFFECTS</TickLabel>
            <p className="font-mono text-xs text-console-400 mt-2 leading-relaxed">
              No effects applied yet. Click <span className="text-signal-500 font-bold">RANDOMIZE</span> or add one above.
            </p>
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
                    className="cursor-pointer accent-[var(--color-signal-500)] w-3.5 h-3.5"
                  />
                  <div>
                    <div className="font-display font-bold text-[13px] text-console-100">{eff.name}</div>
                    <ConsoleBadge>{eff.category}</ConsoleBadge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`gif-lock-btn ${eff.locked ? 'active' : ''}`}
                    onClick={() => onToggleLock(eff.id)}
                    title={eff.locked ? 'Effect Locked (Preserved during Randomize)' : 'Lock Effect'}
                  >
                    {eff.locked ? '🔒' : '🔓'}
                  </button>

                  <button
                    type="button"
                    className="gif-lock-btn text-alert-400 hover:text-alert-400 hover:border-alert-500/40"
                    onClick={() => onRemoveEffect(eff.id)}
                    title="Remove Effect"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="gif-slider-group">
                <div className="gif-slider-label">
                  <span>Intensity</span>
                  <span className="font-mono font-bold text-console-100">{Math.round((eff.intensity ?? 0.5) * 100)}%</span>
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

              <div className="gif-slider-group">
                <div className="gif-slider-label">
                  <span>Speed</span>
                  <span className="font-mono font-bold text-console-100">{(eff.speed ?? 1.0).toFixed(2)}x</span>
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

              {eff.locked && (
                <>
                  <TickDivider className="mt-3" />
                  <div className="flex items-center gap-1.5 mt-2">
                    <ConsoleBadge tone="hazard">LOCKED</ConsoleBadge>
                    <span className="font-mono text-[10px] text-console-400">Preserved on randomize</span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
