import React, { useState, useEffect } from 'react';
import type { GifProject } from '../types/gif';
import { gifApi } from '../api/gifClient';
import { GifStudio } from '../components/gif/GifStudio';

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
    // Opening Studio without an initial project ID allows dropping a new image
    setActiveProjectId('new');
  };

  // If a project is open or user started 'new', render Studio directly
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#07090e',
        color: '#f8fafc',
        padding: '32px 48px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 36,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              style={{
                background: '#151d2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ← Back to App
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
              RANDOM GIF ANIMATION STUDIO
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0 0' }}>
              Upload any image, extract visual features, and synthesize loop-safe animated GIFs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          style={{
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            border: 'none',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(236, 72, 153, 0.4)',
          }}
        >
          + NEW ANIMATION
        </button>
      </div>

      {/* Projects Grid */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>
          RECENT PROJECTS
        </h2>

        {loading ? (
          <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>
            Loading animation projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              background: '#0d121d',
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 60,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No GIF Projects Yet</div>
            <p style={{ color: '#64748b', fontSize: 13, maxWidth: 400, margin: '0 auto 20px auto' }}>
              Create your first animation project by uploading any photo, pixel art, or illustration.
            </p>
            <button
              type="button"
              onClick={handleCreateNew}
              style={{
                background: '#8b5cf6',
                border: 'none',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start Animating
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj.id)}
                style={{
                  background: '#0d121d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {proj.asset && (
                  <div
                    style={{
                      height: 160,
                      borderRadius: 8,
                      overflow: 'hidden',
                      marginBottom: 12,
                      background: '#07090e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={gifApi.getAssetUrl(proj.asset.id)}
                      alt={proj.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{proj.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {proj.width} × {proj.height} • {proj.duration}s @ {proj.fps} FPS
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#8b5cf6',
                    }}
                  >
                    {proj.status}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                    }}
                  >
                    {proj.animationConfiguration?.effects?.length || 0} Effects
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
