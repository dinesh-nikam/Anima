import React, { useState, useEffect, useRef } from 'react';
import type { GifProject, GifRenderJob, DitherMode } from '../../types/gif';
import { gifApi } from '../../api/gifClient';
import { ModalShell, ConsoleButton, TickLabel, TickDivider } from '../ui/primitives';

interface RenderExportModalProps {
  isOpen: boolean;
  project: GifProject;
  onClose: () => void;
}

export const RenderExportModal: React.FC<RenderExportModalProps> = ({
  isOpen,
  project,
  onClose,
}) => {
  const [ditherMode, setDitherMode] = useState<DitherMode>(
    project.animationConfiguration?.pixelArtMode ? 'NONE' : 'FLOYD_STEINBERG',
  );
  const [maxColors, setMaxColors] = useState<number>(256);
  const [pixelArtMode, setPixelArtMode] = useState<boolean>(
    project.animationConfiguration?.pixelArtMode ?? false,
  );

  const [activeJob, setActiveJob] = useState<GifRenderJob | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDitherMode(project.animationConfiguration?.pixelArtMode ? 'NONE' : 'FLOYD_STEINBERG');
      setPixelArtMode(project.animationConfiguration?.pixelArtMode ?? false);
      setRenderError(null);

      gifApi.getProjectRenderStatus(project.id)
        .then((job) => {
          if (job) {
            setActiveJob(job);
            if (job.status === 'RENDERING') {
              setIsRendering(true);
            }
          }
        })
        .catch(() => {});
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (!isRendering || !activeJob?.id) return;

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const job = await gifApi.getRenderJob(activeJob.id);
        setActiveJob(job);

        if (job.status === 'RENDERED') {
          setIsRendering(false);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else if (job.status === 'RENDER_FAILED' || job.status === 'CANCELLED') {
          setIsRendering(false);
          setRenderError(job.errorMessage || `Job ended with status: ${job.status}`);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err: any) {
        console.error('Render polling error:', err);
      }
    }, 600);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isRendering, activeJob?.id]);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setRenderError(null);
    setIsRendering(true);
    try {
      const res = await gifApi.triggerRender(project.id, {
        duration: project.animationConfiguration?.duration || project.duration,
        fps: project.animationConfiguration?.fps || project.fps,
        width: project.outputWidth || project.width,
        height: project.outputHeight || project.height,
        ditherMode,
        maxColors,
        pixelArtMode,
      });

      const initialJob = await gifApi.getRenderJob(res.jobId);
      setActiveJob(initialJob);
    } catch (err: any) {
      setIsRendering(false);
      setRenderError(err.message || 'Failed to start render');
    }
  };

  const handleCancelRender = async () => {
    if (!activeJob?.id) return;
    try {
      await gifApi.cancelRenderJob(activeJob.id);
      setIsRendering(false);
    } catch (err: any) {
      console.error('Cancel render failed:', err);
    }
  };

  const percentProgress = activeJob ? Math.round(activeJob.progress * 100) : 0;
  const isComplete = activeJob?.status === 'RENDERED';

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="EXPORT GIF ANIMATION" eyebrow="RENDER · GIF OUTPUT" maxWidth="max-w-[580px]">
      <div className="flex flex-col gap-5">
        {!isRendering && !isComplete && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <TickLabel>DITHERING ALGORITHM</TickLabel>
                <select
                  className="gif-select"
                  value={ditherMode}
                  onChange={(e) => setDitherMode(e.target.value as DitherMode)}
                >
                  <option value="FLOYD_STEINBERG">Floyd-Steinberg (Smooth)</option>
                  <option value="BAYER">Bayer 4x4 (Retro Arcade)</option>
                  <option value="NONE">None (Sharp Pixel Art)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <TickLabel>COLOR PALETTE</TickLabel>
                <select
                  className="gif-select"
                  value={maxColors}
                  onChange={(e) => setMaxColors(Number(e.target.value))}
                >
                  <option value={256}>256 Colors (Maximum Fidelity)</option>
                  <option value={128}>128 Colors (Balanced Size)</option>
                  <option value={64}>64 Colors (Lightweight Retro)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 p-3 bg-carbon-800 rounded-panel border border-console-700 cursor-pointer">
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-semibold text-xs text-console-100">Pixel-Art Nearest Sampling</span>
                <span className="font-mono text-[11px] text-console-400">Preserves razor-sharp pixels without bilinear blur</span>
              </div>
              <input
                type="checkbox"
                checked={pixelArtMode}
                onChange={(e) => setPixelArtMode(e.target.checked)}
                className="w-[18px] h-[18px] accent-[var(--color-signal-500)] cursor-pointer shrink-0"
              />
            </label>

            <div className="grid grid-cols-3 gap-2 p-3 bg-carbon-950 rounded-panel border border-console-700 text-center">
              <div>
                <TickLabel>DIMENSIONS</TickLabel>
                <div className="font-mono text-xs font-bold text-console-100 mt-1">
                  {project.outputWidth || project.width} × {project.outputHeight || project.height}
                </div>
              </div>
              <div>
                <TickLabel>FPS & TIME</TickLabel>
                <div className="font-mono text-xs font-bold text-console-100 mt-1">
                  {project.animationConfiguration?.fps || project.fps} FPS · {project.animationConfiguration?.duration || project.duration}s
                </div>
              </div>
              <div>
                <TickLabel>TOTAL FRAMES</TickLabel>
                <div className="font-mono text-xs font-bold text-console-100 mt-1">
                  {Math.round(
                    (project.animationConfiguration?.duration || project.duration) *
                    (project.animationConfiguration?.fps || project.fps),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isRendering && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-10 w-[2px] bg-signal-500 animate-pulse" aria-hidden="true" />
            <div className="text-center flex flex-col gap-1">
              <span className="font-display font-bold text-sm text-console-100">Rasterizing & Encoding GIF…</span>
              <span className="font-mono text-xs text-console-400">
                Frame {activeJob?.renderedFrames || 0} of {activeJob?.totalFrames || 0} ({percentProgress}%)
              </span>
            </div>

            <div className="w-full h-1.5 bg-carbon-800 rounded-tick overflow-hidden border border-console-700">
              <div
                className="h-full bg-signal-500 transition-all duration-300"
                style={{ width: `${percentProgress}%` }}
              />
            </div>

            <ConsoleButton variant="secondary" onClick={handleCancelRender} className="mt-2 text-[11px]">
              Cancel Render
            </ConsoleButton>
          </div>
        )}

        {isComplete && activeJob && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-h-60 flex items-center justify-center bg-carbon-950 rounded-panel overflow-hidden border border-console-700">
              <img
                src={gifApi.getRenderDownloadUrl(activeJob.id)}
                alt="Rendered GIF"
                className="max-w-full max-h-60 object-contain"
                style={{ imageRendering: pixelArtMode ? 'pixelated' : 'auto' }}
              />
            </div>

            <div className="flex items-center justify-between w-full font-mono text-xs text-console-400">
              <span>
                Size: <strong className="text-console-100">{activeJob.outputSizeBytes ? `${(activeJob.outputSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Ready'}</strong>
              </span>
              <span>
                Frames: <strong className="text-console-100">{activeJob.totalFrames}</strong>
              </span>
              <span className="text-signal-500 font-bold">✓ Ready for Export</span>
            </div>

            <TickDivider />

            <div className="flex gap-2.5 w-full">
              <a
                href={gifApi.getRenderDownloadUrl(activeJob.id)}
                download={`animation-${project.name.toLowerCase().replace(/\s+/g, '-')}.gif`}
                className="console-btn-primary flex-1 flex items-center justify-center gap-2 no-underline"
              >
                <span>⬇</span> Download Animated GIF
              </a>

              <ConsoleButton
                variant="secondary"
                onClick={() => {
                  setActiveJob(null);
                  setIsRendering(false);
                }}
                className="px-4"
              >
                Re-Render
              </ConsoleButton>
            </div>
          </div>
        )}

        {renderError && (
          <div className="p-2.5 bg-alert-500/10 border border-alert-500/30 rounded-tick text-alert-400 font-mono text-xs">
            {renderError}
          </div>
        )}

        {!isRendering && !isComplete && (
          <div className="flex gap-2.5 justify-end pt-2 border-t border-console-700">
            <ConsoleButton variant="secondary" onClick={onClose}>
              Cancel
            </ConsoleButton>
            <ConsoleButton variant="primary" onClick={handleStartRender}>
              Start GIF Render
            </ConsoleButton>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
