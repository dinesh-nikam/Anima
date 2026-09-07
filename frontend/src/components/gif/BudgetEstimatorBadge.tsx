import React, { useState, useEffect } from 'react';
import type { AnimationBudgetEstimate, AnimationEffectInstance } from '../../types/gif';
import { gifApi } from '../../api/gifClient';
import { ConsoleBadge, TickLabel } from '../ui/primitives';

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
    <div className="bg-carbon-800 border border-console-700 rounded-panel p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <TickLabel>RESOURCE ESTIMATE</TickLabel>
        <ConsoleBadge
          tone={
            estimate.aggregatePerformanceTier === 'LOW'
              ? 'accent'
              : estimate.aggregatePerformanceTier === 'MEDIUM'
                ? 'hazard'
                : 'default'
          }
        >
          {estimate.aggregatePerformanceTier} TIER
        </ConsoleBadge>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-console-300">
        <div>
          <span className="text-console-400">Frames: </span>
          <strong className="text-console-100">{estimate.totalFrames}</strong>
        </div>
        <div>
          <span className="text-console-400">Est. GIF: </span>
          <strong className="text-signal-500">{estimate.estimatedGifSizeFormatted}</strong>
        </div>
        <div>
          <span className="text-console-400">Raw Buffer: </span>
          <strong className="text-console-100">{(estimate.totalRawMemoryBytes / (1024 * 1024)).toFixed(1)} MB</strong>
        </div>
        <div>
          <span className="text-console-400">Render: </span>
          <strong className="text-signal-400">{estimate.estimatedRenderTimeFormatted}</strong>
        </div>
      </div>

      {estimate.warnings.length > 0 && (
        <div className="font-mono text-[11px] leading-relaxed text-hazard-400 border border-hazard-400/20 bg-hazard-400/5 rounded-tick px-2 py-1.5">
          ⚠ {estimate.warnings[0]}
        </div>
      )}
    </div>
  );
};
