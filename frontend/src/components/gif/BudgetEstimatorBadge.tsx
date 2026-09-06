import React, { useState, useEffect } from 'react';
import type { AnimationBudgetEstimate, AnimationEffectInstance } from '../../types/gif';
import { gifApi } from '../../api/gifClient';

interface BudgetEstimatorBadgeProps {
  width: number;
  height: number;
  duration: number;
  fps: number;
  effects: AnimationEffectInstance[];
  pixelArtMode: boolean;
}

export const BudgetEstimatorBadge: React.FC<BudgetEstimatorBadgeProps> = ({
  width,
  height,
  duration,
  fps,
  effects,
  pixelArtMode,
}) => {
  const [estimate, setEstimate] = useState<AnimationBudgetEstimate | null>(null);

  useEffect(() => {
    const activeEffectIds = effects.filter((e) => e.enabled).map((e) => e.id);

    gifApi
      .estimateBudget({
        width: width || 400,
        height: height || 400,
        duration,
        fps,
        effectIds: activeEffectIds,
        pixelArtMode,
      })
      .then((data) => setEstimate(data))
      .catch((err) => console.error('Budget estimation failed:', err));
  }, [width, height, duration, fps, effects, pixelArtMode]);

  if (!estimate) return null;

  return (
    <div
      style={{
        background: 'var(--gif-bg-elevated)',
        border: '1px solid var(--gif-border)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: 'var(--gif-text-muted)' }}>RESOURCE ESTIMATE</span>
        <span
          style={{
            fontWeight: 800,
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
            background:
              estimate.aggregatePerformanceTier === 'LOW'
                ? 'rgba(16, 185, 129, 0.15)'
                : estimate.aggregatePerformanceTier === 'MEDIUM'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color:
              estimate.aggregatePerformanceTier === 'LOW'
                ? 'var(--gif-accent-emerald)'
                : estimate.aggregatePerformanceTier === 'MEDIUM'
                ? 'var(--gif-accent-amber)'
                : '#ef4444',
          }}
        >
          {estimate.aggregatePerformanceTier} TIER
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: 'var(--gif-text-secondary)' }}>
        <div>
          <span>Frames: </span>
          <strong style={{ color: '#ffffff' }}>{estimate.totalFrames}</strong>
        </div>
        <div>
          <span>Est. GIF Size: </span>
          <strong style={{ color: 'var(--gif-accent-cyan)' }}>{estimate.estimatedGifSizeFormatted}</strong>
        </div>
        <div>
          <span>Raw Buffer: </span>
          <strong style={{ color: '#ffffff' }}>{(estimate.totalRawMemoryBytes / (1024 * 1024)).toFixed(1)} MB</strong>
        </div>
        <div>
          <span>Render Latency: </span>
          <strong style={{ color: 'var(--gif-accent-purple)' }}>{estimate.estimatedRenderTimeFormatted}</strong>
        </div>
      </div>

      {estimate.warnings.length > 0 && (
        <div style={{ marginTop: 4, color: 'var(--gif-accent-amber)', fontSize: 10, lineHeight: 1.3 }}>
          ⚠️ {estimate.warnings[0]}
        </div>
      )}
    </div>
  );
};
