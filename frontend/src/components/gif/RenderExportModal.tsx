import React, { useState, useEffect, useRef } from 'react';
import type { GifProject, GifRenderJob, DitherMode } from '../../types/gif';
import { gifApi } from '../../api/gifClient';

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

  // Sync default options when modal opens
  useEffect(() => {
    if (isOpen) {
      setDitherMode(project.animationConfiguration?.pixelArtMode ? 'NONE' : 'FLOYD_STEINBERG');
      setPixelArtMode(project.animationConfiguration?.pixelArtMode ?? false);
      setRenderError(null);

      // Check if project already has a recent completed or running render
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

  // Polling loop when rendering
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
    <div
      className="gif-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="gif-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 580,
          borderRadius: 16,
          border: '1px solid var(--gif-border-focus)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(139, 92, 246, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--gif-bg-surface)',
        }}
      >
        {/* Modal Header */}
        <div
          className="gif-panel-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gif-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎞️</span>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.05em' }}>
              EXPORT GIF ANIMATION
            </span>
          </div>
          <button
            className="gif-btn-ghost"
            onClick={onClose}
            style={{ fontSize: 18, width: 32, height: 32, padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Options (visible when not actively rendering) */}
          {!isRendering && !isComplete && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gif-text-muted)' }}>
                    DITHERING ALGORITHM
                  </label>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gif-text-muted)' }}>
                    COLOR PALETTE
                  </label>
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

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 8,
                  border: '1px solid var(--gif-border-subtle)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Pixel-Art Nearest Sampling</span>
                  <span style={{ fontSize: 11, color: 'var(--gif-text-muted)' }}>
                    Preserves razor-sharp pixels without bilinear edge blurring
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pixelArtMode}
                  onChange={(e) => setPixelArtMode(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--gif-accent-purple)', cursor: 'pointer' }}
                />
              </div>

              {/* Render Stats Overview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  padding: 12,
                  backgroundColor: 'var(--gif-bg-canvas)',
                  borderRadius: 8,
                  border: '1px solid var(--gif-border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gif-text-muted)' }}>DIMENSIONS</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {project.outputWidth || project.width} × {project.outputHeight || project.height}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gif-text-muted)' }}>FPS & TIME</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {project.animationConfiguration?.fps || project.fps} FPS · {project.animationConfiguration?.duration || project.duration}s
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gif-text-muted)' }}>TOTAL FRAMES</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {Math.round(
                      (project.animationConfiguration?.duration || project.duration) *
                      (project.animationConfiguration?.fps || project.fps),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Rendering Progress Screen */}
          {isRendering && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '3px solid rgba(139, 92, 246, 0.2)',
                  borderTopColor: 'var(--gif-accent-purple)',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Rasterizing & Encoding GIF...</span>
                <span style={{ fontSize: 12, color: 'var(--gif-text-muted)' }}>
                  Frame {activeJob?.renderedFrames || 0} of {activeJob?.totalFrames || 0} ({percentProgress}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percentProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <button
                className="gif-btn-ghost"
                onClick={handleCancelRender}
                style={{ fontSize: 12, marginTop: 8 }}
              >
                Cancel Render
              </button>
            </div>
          )}

          {/* Render Completed Screen */}
          {isComplete && activeJob && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Output Preview */}
              <div
                style={{
                  width: '100%',
                  maxHeight: 240,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--gif-border-subtle)',
                }}
              >
                <img
                  src={gifApi.getRenderDownloadUrl(activeJob.id)}
                  alt="Rendered GIF"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 240,
                    objectFit: 'contain',
                    imageRendering: pixelArtMode ? 'pixelated' : 'auto',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: 12,
                  color: 'var(--gif-text-muted)',
                }}
              >
                <span>
                  Size: <strong>{activeJob.outputSizeBytes ? `${(activeJob.outputSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Ready'}</strong>
                </span>
                <span>
                  Frames: <strong>{activeJob.totalFrames}</strong>
                </span>
                <span style={{ color: 'var(--gif-accent-emerald)', fontWeight: 700 }}>
                  ✓ Ready for Export
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <a
                  href={gifApi.getRenderDownloadUrl(activeJob.id)}
                  download={`animation-${project.name.toLowerCase().replace(/\s+/g, '-')}.gif`}
                  className="gif-btn-primary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    padding: '12px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>⬇️</span> Download Animated GIF
                </a>

                <button
                  className="gif-btn-ghost"
                  onClick={() => {
                    setActiveJob(null);
                    setIsRendering(false);
                  }}
                  style={{ padding: '12px 16px', fontSize: 12 }}
                >
                  Re-Render
                </button>
              </div>
            </div>
          )}

          {renderError && (
            <div
              style={{
                padding: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#f87171',
                fontSize: 12,
              }}
            >
              {renderError}
            </div>
          )}

          {/* Footer Action Buttons (when idle) */}
          {!isRendering && !isComplete && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="gif-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="gif-btn-primary"
                onClick={handleStartRender}
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                🎬 Start GIF Render
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
