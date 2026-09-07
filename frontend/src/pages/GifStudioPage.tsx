import React, { useState, useEffect } from 'react';
import type { GifProject } from '../types/gif';
import { gifApi } from '../api/gifClient';
import { GifStudio } from '../components/gif/GifStudio';
import {
  SignalHeader,
  ConsoleButton,
  ConsoleBadge,
  ConsoleSpinner,
  TickLabel,
} from '../components/ui/primitives';

interface GifStudioPageProps {
  onBackToApp?: () => void;
}

export const GifStudioPage: React.FC<GifStudioPageProps> = ({ onBackToApp }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/gif/')) {
      return hash.replace('#/gif/', '');
    }
    return null;
  });

  const [projects, setProjects] = useState<GifProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/gif/')) {
        setActiveProjectId(hash.replace('#/gif/', ''));
      } else if (hash === '#/gif') {
        setActiveProjectId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeProjectId) return;
    setLoading(true);
    gifApi
      .listProjects({ limit: 20 })
      .then((res) => setProjects(res.items))
      .catch((err) => console.error('Failed to list projects:', err))
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  const handleOpenProject = (id: string) => {
    window.location.hash = `#/gif/${id}`;
    setActiveProjectId(id);
  };

  const handleCreateNew = () => {
    setActiveProjectId('new');
  };

  if (activeProjectId) {
    return (
      <GifStudio
        initialProjectId={activeProjectId === 'new' ? null : activeProjectId}
        onBackToApp={() => {
          window.location.hash = '#/gif';
          setActiveProjectId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-carbon-950 text-console-100 font-display">
      <SignalHeader
        brandMark="AN"
        brandLabel="GIF ANIMATION STUDIO"
        live="PROCEDURAL MOTION · 35 EFFECTS"
        right={
          <>
            {onBackToApp && (
              <ConsoleButton variant="secondary" onClick={onBackToApp}>
                ← Back to App
              </ConsoleButton>
            )}
            <ConsoleButton variant="primary" onClick={handleCreateNew}>
              + NEW ANIMATION
            </ConsoleButton>
          </>
        }
      />

      <div className="px-6 lg:px-12 py-8">
        {/* Intro copy preserved — now console-typed */}
        <div className="mb-8">
          <h2 className="font-display font-bold text-lg tracking-tight text-console-100">
            RANDOM GIF ANIMATION STUDIO
          </h2>
          <p className="font-mono text-xs text-console-300 mt-1">
            Upload any image, extract visual features, and synthesize loop-safe animated GIFs.
          </p>
        </div>

        <div className="tick-divider mb-6" />

        <TickLabel className="mb-4">RECENT PROJECTS</TickLabel>

        {loading ? (
          <ConsoleSpinner label="Loading animation projects..." />
        ) : projects.length === 0 ? (
          <div className="instrument-panel border-dashed py-14 px-8 text-center">
            <div className="mx-auto mb-4 h-8 w-[2px] bg-signal-500/60" aria-hidden="true" />
            <TickLabel accent>NO SIGNAL</TickLabel>
            <div className="font-display font-bold text-base text-console-100 mt-2">
              No GIF Projects Yet
            </div>
            <p className="font-mono text-xs text-console-400 max-w-[400px] mx-auto mt-2 leading-relaxed">
              Create your first animation project by uploading any photo, pixel art, or illustration.
            </p>
            <ConsoleButton variant="primary" onClick={handleCreateNew} className="mt-5">
              Start Animating
            </ConsoleButton>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => handleOpenProject(proj.id)}
                className="instrument-panel-hover text-left p-4 flex flex-col gap-3 group"
              >
                {proj.asset && (
                  <div className="h-40 rounded-media overflow-hidden bg-carbon-950 flex items-center justify-center border border-console-700">
                    <img
                      src={gifApi.getAssetUrl(proj.asset.id)}
                      alt={proj.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <div className="font-display font-bold text-sm text-console-100 truncate">
                    {proj.name}
                  </div>
                  <div className="font-mono text-[11px] text-console-400 mt-1">
                    {proj.width} × {proj.height} · {proj.duration}s @ {proj.fps} FPS
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <ConsoleBadge tone="accent">{proj.status}</ConsoleBadge>
                  <ConsoleBadge>
                    {proj.animationConfiguration?.effects?.length || 0} Effects
                  </ConsoleBadge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
