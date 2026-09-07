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
import {
  SignalHeader,
  ConsoleButton,
  ConsoleSpinner,
  TickLabel,
  TickDivider,
} from '../ui/primitives';
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
      const asset = await gifApi.uploadImage(file);

      const newProj = await gifApi.createProject({
        assetId: asset.id,
        name: file.name.replace(/\.[^/.]+$/, ''),
      });

      const { analysis: analysisResult } = await gifApi.analyzeProject(newProj.id);
      setAnalysis(analysisResult);

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
      <div className="gif-studio-root">
        <SignalHeader
          brandMark="AN"
          brandLabel="GIF ANIMATION STUDIO"
          live="PROCEDURAL MOTION · 35 EFFECTS"
          right={
            onBackToApp ? (
              <ConsoleButton variant="secondary" onClick={onBackToApp}>
                ← Back to App
              </ConsoleButton>
            ) : undefined
          }
        />
        <div className="flex-1 grid place-items-center">
          <ConsoleSpinner label="Loading Animation Studio..." />
        </div>
      </div>
    );
  }

  return (
    <div className="gif-studio-root">
      <SignalHeader
        brandMark="AN"
        brandLabel="GIF ANIMATION STUDIO"
        live="PROCEDURAL MOTION · 35 EFFECTS"
        right={
          <div className="flex items-center gap-2">
            {project && (
              <>
                <span className="hidden lg:inline font-mono text-xs text-console-300 truncate max-w-[160px]">
                  {project.name}
                </span>
                <ConsoleButton variant="secondary" onClick={() => setIsHistoryDrawerOpen(true)}>
                  SNAPSHOTS
                </ConsoleButton>
                <ConsoleButton variant="primary" onClick={() => setIsExportModalOpen(true)}>
                  EXPORT GIF
                </ConsoleButton>
              </>
            )}
            {onBackToApp && (
              <ConsoleButton variant="secondary" onClick={onBackToApp}>
                ← Back
              </ConsoleButton>
            )}
          </div>
        }
      />

      {/* Main Workspace Grid */}
      <div className="gif-workspace-grid">
        {/* Left Panel: Upload, Image Info & Budget Estimator */}
        <aside className="gif-panel">
          <div className="gif-panel-header">
            <TickLabel>PROJECT SOURCE</TickLabel>
          </div>

          <ImageUploadDropzone
            onFileSelected={handleUploadFile}
            isUploading={isUploading}
          />

          {project && (
            <div className="p-3.5 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <TickLabel>IMAGE RESOLUTION</TickLabel>
                <span className="font-mono text-xs font-bold text-console-100">
                  {project.width} × {project.height} px ({project.format})
                </span>
              </div>

              <TickDivider />

              {analysis && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <TickLabel>CV ANALYSIS</TickLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.pixelArtConfidence >= 0.7 && (
                        <span className="console-badge console-badge-accent">Pixel-Art</span>
                      )}
                      {analysis.darkSceneConfidence >= 0.6 && (
                        <span className="console-badge console-badge-hazard">Dark Scene</span>
                      )}
                      {analysis.photographicConfidence >= 0.6 && (
                        <span className="console-badge">Photo</span>
                      )}
                      {analysis.hasAlpha && (
                        <span className="console-badge console-badge-accent">Alpha Cutout</span>
                      )}
                    </div>
                  </div>
                  <TickDivider />
                </>
              )}

              <BudgetEstimatorBadge
                width={project.width}
                height={project.height}
                duration={duration}
                fps={fps}
                effects={activeEffects}
                pixelArtMode={pixelArtMode}
              />

              {project && (
                <>
                  <TickDivider />
                  <RandomizeControls
                    currentProfile={activeProfile}
                    currentSeed={project.randomSeed ? project.randomSeed.toString() : '0'}
                    isRandomizing={isRandomizing}
                    appliedBiases={appliedBiases}
                    onRandomize={handleRandomize}
                    onProfileChange={(p) => setActiveProfile(p)}
                  />
                </>
              )}
            </div>
          )}

          {!project && (
            <div className="p-4">
              <p className="font-mono text-[11px] leading-relaxed text-console-400">
                Upload an image to start animating. Analysis runs automatically.
              </p>
            </div>
          )}
        </aside>

        {/* Center: Canvas Live 60fps Viewport */}
        <main className="relative flex flex-col bg-carbon-950">
          {project && imageSrc ? (
            <div className="flex-1 flex flex-col p-3 gap-2">
              <div className="corner-ticks flex-1 flex flex-col rounded-media border border-console-700 overflow-hidden bg-carbon-900">
                <CanvasPreview
                  imageSrc={imageSrc}
                  effects={activeEffects}
                  currentTime={currentTime}
                  duration={duration}
                  seed={seed}
                  pixelArtMode={pixelArtMode}
                />
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-console-400">
                <span className="w-1.5 h-1.5 bg-signal-500 rounded-tick animate-pulse" aria-hidden="true" />
                LIVE PREVIEW · 60 FPS · SEED {seed}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-8 w-[2px] bg-signal-500/60" aria-hidden="true" />
              <TickLabel accent>NO SIGNAL</TickLabel>
              <span className="font-display font-bold text-sm text-console-100">No Image Loaded</span>
              <span className="font-mono text-xs text-console-400">
                Drop an image on the left to activate the animation canvas
              </span>
            </div>
          )}
        </main>

        {/* Right Panel: Effect Stack & Parameter Controls */}
        <aside className="gif-panel right">
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
