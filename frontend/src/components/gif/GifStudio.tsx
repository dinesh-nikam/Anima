import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GifProject,
  GifAnalysisResult,
  AnimationEffectInstance,
  RandomizationProfile,
  EffectMetadata,
  GifProjectVersion,
} from '../../types/gif';
import { gifApi } from '../../api/gifClient';
import { CanvasPreview } from './CanvasPreview';
import { TimelineControls } from './TimelineControls';
import { EffectListPanel } from './EffectListPanel';
import { AddEffectModal } from './AddEffectModal';
import { RandomizeControls } from './RandomizeControls';
import { BudgetEstimatorBadge } from './BudgetEstimatorBadge';
import { ImageUploadDropzone } from './ImageUploadDropzone';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';
import { RenderExportModal } from './RenderExportModal';
import './gifStudio.css';

interface GifStudioProps {
  initialProjectId?: string | null;
  onBackToApp?: () => void;
}

export const GifStudio: React.FC<GifStudioProps> = ({
  initialProjectId,
  onBackToApp,
}) => {
  const [project, setProject] = useState<GifProject | null>(null);
  const [analysis, setAnalysis] = useState<GifAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0.0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Randomization and UI Modal States
  const [activeProfile, setActiveProfile] = useState<RandomizationProfile>('BALANCED');
  const [appliedBiases, setAppliedBiases] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load project by ID if provided
  useEffect(() => {
    if (!initialProjectId) return;
    setLoading(true);
    gifApi
      .getProject(initialProjectId)
      .then((proj) => {
        setProject(proj);
        return gifApi.getProjectAnalysis(proj.id).catch(() => null);
      })
      .then((analysisData) => {
        if (analysisData) setAnalysis(analysisData);
      })
      .catch((err) => console.error('Failed to load initial project:', err))
      .finally(() => setLoading(false));
  }, [initialProjectId]);

  // Main 60fps Playback Loop
  useEffect(() => {
    const duration = project?.animationConfiguration?.duration || 3.0;

    const tick = (now: number) => {
      const deltaSeconds = (now - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = now;

      if (isPlaying && duration > 0) {
        setCurrentTime((prev) => (prev + deltaSeconds) % duration);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, project?.animationConfiguration?.duration]);

  // Handle Global Hotkeys (Space: Play/Pause, R: Randomize)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleRandomize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Handle Image Upload & Auto-randomize
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Upload Binary Asset
      const asset = await gifApi.uploadImage(file);

      // 2. Create Project
      const newProj = await gifApi.createProject({
        assetId: asset.id,
        name: file.name.replace(/\.[^/.]+$/, ''),
      });

      // 3. Trigger Algorithmic Computer Vision Analysis
      const { analysis: analysisResult } = await gifApi.analyzeProject(newProj.id);
      setAnalysis(analysisResult);

      // 4. Initial Feature-Aware Randomization
      const { project: randomizedProj, randomizeResult } = await gifApi.randomizeProject(
        newProj.id,
        { profile: 'BALANCED' },
      );

      setProject(randomizedProj);
      setAppliedBiases(randomizeResult.appliedBiases || []);
      setCurrentTime(0);
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Upload & project initiation failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Prominent RANDOMIZE Action Trigger
  const handleRandomize = useCallback(
    async (profileOverride?: RandomizationProfile, seedOverride?: string) => {
      if (!project || isRandomizing) return;
      setIsRandomizing(true);
      const prof = profileOverride || activeProfile;

      try {
        const { project: updatedProj, randomizeResult } = await gifApi.randomizeProject(
          project.id,
          {
            profile: prof,
            seed: seedOverride,
            preserveLocked: true,
          },
        );

        setProject(updatedProj);
        setAppliedBiases(randomizeResult.appliedBiases || []);
        setCurrentTime(0);
      } catch (err: any) {
        console.error('Randomization failed:', err);
      } finally {
        setIsRandomizing(false);
      }
    },
    [project, isRandomizing, activeProfile],
  );

  // Effect Mutation Handlers
  const handleToggleLock = (effectId: string) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const updated = currentEffects.map((e) =>
      e.id === effectId ? { ...e, locked: !e.locked } : e,
    );

    updateProjectEffects(updated);
  };

  const handleToggleEnable = (effectId: string) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const updated = currentEffects.map((e) =>
      e.id === effectId ? { ...e, enabled: !e.enabled } : e,
    );

    updateProjectEffects(updated);
  };

  const handleUpdateIntensity = (effectId: string, intensity: number) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const updated = currentEffects.map((e) =>
      e.id === effectId ? { ...e, intensity } : e,
    );

    updateProjectEffects(updated);
  };

  const handleUpdateSpeed = (effectId: string, speed: number) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const updated = currentEffects.map((e) =>
      e.id === effectId ? { ...e, speed } : e,
    );

    updateProjectEffects(updated);
  };

  const handleRemoveEffect = (effectId: string) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const updated = currentEffects.filter((e) => e.id !== effectId);

    updateProjectEffects(updated);
  };

  const handleAddEffect = (metadata: EffectMetadata) => {
    if (!project) return;
    const currentEffects = project.animationConfiguration?.effects || [];
    const newInstance: AnimationEffectInstance = {
      id: metadata.id,
      name: metadata.name,
      category: metadata.category,
      enabled: true,
      locked: false,
      intensity: metadata.intensityRange.default,
      speed: 1.0,
      parameters: { ...metadata.defaultParameters },
    };

    updateProjectEffects([...currentEffects, newInstance]);
    setIsAddModalOpen(false);
  };

  const updateProjectEffects = (updatedEffects: AnimationEffectInstance[]) => {
    if (!project) return;
    const updatedConfig = {
      ...project.animationConfiguration,
      effects: updatedEffects,
    };

    setProject({
      ...project,
      animationConfiguration: updatedConfig,
    });

    // Debounced persist to API
    gifApi.updateProject(project.id, {
      animationConfiguration: updatedConfig,
    }).catch((err) => console.error('Failed to sync effect edit:', err));
  };

  const handleDurationChange = (newDuration: number) => {
    if (!project) return;
    const updatedConfig = {
      ...project.animationConfiguration,
      duration: newDuration,
    };
    setProject({ ...project, duration: newDuration, animationConfiguration: updatedConfig });
    gifApi.updateProject(project.id, { duration: newDuration, animationConfiguration: updatedConfig });
  };

  const handleFpsChange = (newFps: number) => {
    if (!project) return;
    const updatedConfig = {
      ...project.animationConfiguration,
      fps: newFps,
    };
    setProject({ ...project, fps: newFps, animationConfiguration: updatedConfig });
    gifApi.updateProject(project.id, { fps: newFps, animationConfiguration: updatedConfig });
  };

  const handleRestoreVersion = (version: GifProjectVersion) => {
    if (!project) return;
    const restoredConfig = version.animationConfiguration;
    setProject({
      ...project,
      animationConfiguration: restoredConfig,
      randomSeed: version.randomSeed,
      duration: version.duration,
      fps: version.fps,
    });
    setCurrentTime(0);

    gifApi.updateProject(project.id, {
      animationConfiguration: restoredConfig,
      duration: version.duration,
      fps: version.fps,
      randomSeed: version.randomSeed,
    });
  };

  const activeEffects = project?.animationConfiguration?.effects || [];
  const duration = project?.animationConfiguration?.duration || 3.0;
  const fps = project?.animationConfiguration?.fps || 15;
  const seed = Number(project?.randomSeed || 42);
  const pixelArtMode = Boolean(project?.animationConfiguration?.pixelArtMode);
  const imageSrc = project?.asset ? gifApi.getAssetUrl(project.asset.id) : '';

  if (loading) {
    return (
      <div className="gif-studio-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎲</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gif-text-secondary)' }}>
          Loading Animation Studio...
        </div>
      </div>
    );
  }

  return (
    <div className="gif-studio-root">
      {/* Top Header */}
      <header className="gif-studio-header">
        <div className="gif-brand-area">
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="gif-icon-btn"
              title="Return to Main Dashboard"
            >
              ←
            </button>
          )}
          <span className="gif-brand-logo">Random GIF Studio</span>
          <span className="gif-brand-badge">PHASE 5 PREVIEW</span>
        </div>

        {/* Project Name, Snapshots and Export Actions */}
        {project && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {project.name}
            </span>
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="gif-overlay-btn"
              title="View Previous Snapshots"
            >
              📜 SNAPSHOTS
            </button>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="gif-btn-primary"
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700 }}
              title="Render and Download High Quality Animated GIF"
            >
              🎬 EXPORT GIF
            </button>
          </div>
        )}

        {/* Prominent RANDOMIZE Action Button */}
        {project ? (
          <RandomizeControls
            currentProfile={activeProfile}
            currentSeed={project.randomSeed ? project.randomSeed.toString() : '0'}
            isRandomizing={isRandomizing}
            appliedBiases={appliedBiases}
            onRandomize={handleRandomize}
            onProfileChange={(p) => setActiveProfile(p)}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--gif-text-muted)' }}>
            Upload an image to start animating!
          </div>
        )}
      </header>

      {/* Main Workspace Grid */}
      <div className="gif-workspace-grid">
        {/* Left Panel: Upload, Image Info & Budget Estimator */}
        <aside className="gif-panel">
          <div className="gif-panel-header">
            <span>PROJECT SOURCE</span>
          </div>

          <ImageUploadDropzone
            onFileSelected={handleUploadFile}
            isUploading={isUploading}
          />

          {project && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: 'var(--gif-text-muted)', fontWeight: 600 }}>IMAGE RESOLUTION</span>
                <span style={{ fontWeight: 700 }}>{project.width} × {project.height} px ({project.format})</span>
              </div>

              {analysis && (
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: 'var(--gif-text-muted)', fontWeight: 600 }}>CV ANALYSIS</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {analysis.pixelArtConfidence >= 0.7 && (
                      <span className="gif-category-tag" style={{ color: 'var(--gif-accent-purple)' }}>Pixel-Art</span>
                    )}
                    {analysis.darkSceneConfidence >= 0.6 && (
                      <span className="gif-category-tag" style={{ color: 'var(--gif-accent-amber)' }}>Dark Scene</span>
                    )}
                    {analysis.photographicConfidence >= 0.6 && (
                      <span className="gif-category-tag" style={{ color: 'var(--gif-accent-cyan)' }}>Photo</span>
                    )}
                    {analysis.hasAlpha && (
                      <span className="gif-category-tag" style={{ color: 'var(--gif-accent-emerald)' }}>Alpha Cutout</span>
                    )}
                  </div>
                </div>
              )}

              {/* Real-Time Frame & Memory Budget Estimator */}
              <BudgetEstimatorBadge
                width={project.width}
                height={project.height}
                duration={duration}
                fps={fps}
                effects={activeEffects}
                pixelArtMode={pixelArtMode}
              />
            </div>
          )}
        </aside>

        {/* Center: Canvas Live 60fps Viewport */}
        <main style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {project && imageSrc ? (
            <CanvasPreview
              imageSrc={imageSrc}
              effects={activeEffects}
              currentTime={currentTime}
              duration={duration}
              seed={seed}
              pixelArtMode={pixelArtMode}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gif-text-muted)',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 48 }}>🎨</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>No Image Loaded</span>
              <span style={{ fontSize: 13 }}>Drop an image on the left to activate the animation canvas</span>
            </div>
          )}
        </main>

        {/* Right Panel: Effect Stack & Parameter Controls */}
        <aside>
          <EffectListPanel
            effects={activeEffects}
            onToggleLock={handleToggleLock}
            onToggleEnable={handleToggleEnable}
            onUpdateIntensity={handleUpdateIntensity}
            onUpdateSpeed={handleUpdateSpeed}
            onRemoveEffect={handleRemoveEffect}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        </aside>

        {/* Bottom Bar: Timeline Scrubber & Playback Controls */}
        <TimelineControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          fps={fps}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onSeek={(t) => setCurrentTime(t)}
          onDurationChange={handleDurationChange}
          onFpsChange={handleFpsChange}
        />
      </div>

      {/* Catalog Browser Modal */}
      <AddEffectModal
        isOpen={isAddModalOpen}
        activeEffectIds={activeEffects.map((e) => e.id)}
        onClose={() => setIsAddModalOpen(false)}
        onSelectEffect={handleAddEffect}
      />

      {/* Version History Drawer */}
      {project && (
        <VersionHistoryDrawer
          projectId={project.id}
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          onRestoreVersion={handleRestoreVersion}
        />
      )}

      {/* Render and Export Modal */}
      {project && (
        <RenderExportModal
          isOpen={isExportModalOpen}
          project={project}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
