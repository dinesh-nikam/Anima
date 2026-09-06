import React, { useRef, useEffect, useState } from 'react';
import type { AnimationEffectInstance } from '../../types/gif';
import { evaluateFrameTransforms } from './clientEffectEvaluator';

interface CanvasPreviewProps {
  imageSrc: string;
  effects: AnimationEffectInstance[];
  currentTime: number;
  duration: number;
  seed: number;
  pixelArtMode: boolean;
  onDimensionsLoaded?: (width: number, height: number) => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  imageSrc,
  effects,
  currentTime,
  duration,
  seed,
  pixelArtMode,
  onDimensionsLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoomMode, setZoomMode] = useState<'fit' | '1x' | '2x'>('fit');
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({ width: 400, height: 400 });

  // Load source image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      if (onDimensionsLoaded) {
        onDimensionsLoaded(img.naturalWidth, img.naturalHeight);
      }
    };
  }, [imageSrc, onDimensionsLoaded]);

  // Render frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || imgSize.width === 0 || imgSize.height === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = imgSize.width;
    const h = imgSize.height;

    // Set canvas dimensions
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Normalized loop time
    const safeDuration = duration > 0 ? duration : 3.0;
    const normalizedTime = (currentTime % safeDuration) / safeDuration;

    const transform = evaluateFrameTransforms(
      effects,
      normalizedTime,
      w,
      h,
      seed,
      pixelArtMode,
    );

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Disable image smoothing in pixel art mode
    if (pixelArtMode) {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
    }

    // Apply color filters
    const filterParts: string[] = [];
    if (transform.brightness !== 1.0) {
      filterParts.push(`brightness(${Math.max(0.1, transform.brightness)})`);
    }
    if (transform.contrast !== 1.0) {
      filterParts.push(`contrast(${Math.max(0.1, transform.contrast)})`);
    }
    if (transform.saturation !== 1.0) {
      filterParts.push(`saturate(${Math.max(0.0, transform.saturation)})`);
    }
    if (transform.hueShiftDegrees !== 0) {
      filterParts.push(`hue-rotate(${transform.hueShiftDegrees}deg)`);
    }
    ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

    // Center of canvas for geometric transforms
    ctx.translate(w / 2 + transform.translateX, h / 2 + transform.translateY);
    ctx.scale(transform.scale, transform.scale);
    ctx.rotate((transform.rotationDegrees * Math.PI) / 180.0);

    // Draw base image centered
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    // Draw Chromatic Aberration channel offsets if active
    const hasRgbOffset =
      transform.rgbOffsets.r[0] !== 0 ||
      transform.rgbOffsets.r[1] !== 0 ||
      transform.rgbOffsets.b[0] !== 0 ||
      transform.rgbOffsets.b[1] !== 0;

    if (hasRgbOffset) {
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'none';

      // Red channel ghost
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.drawImage(
        img,
        -w / 2 + transform.rgbOffsets.r[0],
        -h / 2 + transform.rgbOffsets.r[1],
        w,
        h,
      );

      // Blue channel ghost
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
      ctx.drawImage(
        img,
        -w / 2 + transform.rgbOffsets.b[0],
        -h / 2 + transform.rgbOffsets.b[1],
        w,
        h,
      );

      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // Render Overlay Light bloom
    if (transform.overlayAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${transform.overlayAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Render Atmospheric Particles
    if (transform.particles.length > 0) {
      ctx.save();
      for (const p of transform.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Render CRT Scanlines
    if (transform.scanlines) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${transform.scanlines.alpha})`;
      const spacing = transform.scanlines.spacing;
      const offset = transform.scanlines.offset;
      for (let y = offset; y < h; y += spacing) {
        ctx.fillRect(0, y, w, 1);
      }
      ctx.restore();
    }

    // Render VHS Tracking line
    if (transform.vhsTrackingY !== undefined) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, transform.vhsTrackingY, w, 6);
      ctx.restore();
    }
  }, [effects, currentTime, duration, seed, pixelArtMode, imgSize]);

  // Compute zoom scale style
  const getCanvasScaleStyle = () => {
    switch (zoomMode) {
      case '1x':
        return { width: `${imgSize.width}px`, height: `${imgSize.height}px` };
      case '2x':
        return { width: `${imgSize.width * 2}px`, height: `${imgSize.height * 2}px` };
      case 'fit':
      default:
        return { maxWidth: '90%', maxHeight: '85%', objectFit: 'contain' as const };
    }
  };

  return (
    <div className="gif-viewport-container">
      {/* Floating Viewport Overlays */}
      <div className="gif-viewport-overlay">
        <button
          type="button"
          className={`gif-overlay-btn ${zoomMode === 'fit' ? 'active' : ''}`}
          onClick={() => setZoomMode('fit')}
          title="Fit View"
        >
          FIT
        </button>
        <button
          type="button"
          className={`gif-overlay-btn ${zoomMode === '1x' ? 'active' : ''}`}
          onClick={() => setZoomMode('1x')}
          title="100% Original Size"
        >
          1:1
        </button>
        <button
          type="button"
          className={`gif-overlay-btn ${zoomMode === '2x' ? 'active' : ''}`}
          onClick={() => setZoomMode('2x')}
          title="200% Pixel Zoom"
        >
          2X
        </button>
        <button
          type="button"
          className={`gif-overlay-btn ${showCheckerboard ? 'active' : ''}`}
          onClick={() => setShowCheckerboard(!showCheckerboard)}
          title="Toggle Transparent Checkerboard"
        >
          CHECKER
        </button>
      </div>

      {/* Canvas Viewport Stage */}
      <div className={`gif-canvas-stage ${showCheckerboard ? 'gif-checkerboard-bg' : ''}`}>
        <canvas
          ref={canvasRef}
          className={`gif-main-canvas ${pixelArtMode ? 'pixel-art' : ''}`}
          style={getCanvasScaleStyle()}
        />
      </div>
    </div>
  );
};
