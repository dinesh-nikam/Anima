import React, { useRef, useCallback } from 'react';

interface TimelineControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onFpsChange: (fps: number) => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  fps,
  onTogglePlay,
  onSeek,
  onDurationChange,
  onFpsChange,
}) => {
  const scrubberRailRef = useRef<HTMLDivElement | null>(null);

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const currentFrame = Math.min(totalFrames, Math.floor((currentTime / duration) * totalFrames) + 1);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRailRef.current) return;
    const rect = scrubberRailRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newTime = (clickX / rect.width) * duration;
    onSeek(newTime);
  };

  const handleStep = useCallback(
    (direction: -1 | 1) => {
      const frameDuration = 1 / fps;
      const nextTime = Math.max(0, Math.min(duration, currentTime + direction * frameDuration));
      onSeek(nextTime);
    },
    [currentTime, duration, fps, onSeek],
  );

  return (
    <div className="gif-timeline-footer">
      {/* Interactive Scrubber Rail */}
      <div
        ref={scrubberRailRef}
        className="gif-timeline-scrubber-track"
        onClick={handleScrubberClick}
      >
        <div className="gif-timeline-rail">
          <div
            className="gif-timeline-progress"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div
          className="gif-scrubber-handle"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Control Buttons & Indicators */}
      <div className="gif-timeline-controls-row">
        {/* Playback Controls */}
        <div className="gif-playback-buttons">
          <button
            type="button"
            className="gif-icon-btn"
            onClick={() => onSeek(0)}
            title="Jump to Start"
          >
            ⏮
          </button>
          <button
            type="button"
            className="gif-icon-btn"
            onClick={() => handleStep(-1)}
            title="Step Back 1 Frame"
          >
            ⏪
          </button>
          <button
            type="button"
            className={`gif-icon-btn primary-play`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            className="gif-icon-btn"
            onClick={() => handleStep(1)}
            title="Step Forward 1 Frame"
          >
            ⏩
          </button>

          {/* Time and Frame Counters */}
          <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: 4,
                color: 'var(--gif-text-secondary)',
              }}
            >
              FRAME {currentFrame}/{totalFrames}
            </span>
          </div>
        </div>

        {/* Duration & FPS Adjusters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--gif-text-muted)', fontWeight: 600 }}>FPS:</span>
            <select
              value={fps}
              onChange={(e) => onFpsChange(Number(e.target.value))}
              style={{
                background: 'var(--gif-bg-elevated)',
                border: '1px solid var(--gif-border)',
                color: '#ffffff',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value={8}>8 FPS</option>
              <option value={10}>10 FPS</option>
              <option value={12}>12 FPS</option>
              <option value={15}>15 FPS (Default)</option>
              <option value={20}>20 FPS</option>
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--gif-text-muted)', fontWeight: 600 }}>DURATION:</span>
            <select
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              style={{
                background: 'var(--gif-bg-elevated)',
                border: '1px solid var(--gif-border)',
                color: '#ffffff',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value={1.0}>1.0s</option>
              <option value={1.5}>1.5s</option>
              <option value={2.0}>2.0s</option>
              <option value={2.5}>2.5s</option>
              <option value={3.0}>3.0s (Default)</option>
              <option value={4.0}>4.0s</option>
              <option value={5.0}>5.0s</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
