import React, { useEffect, useState } from 'react';
import type { GifProjectVersion } from '../../types/gif';
import { gifApi } from '../../api/gifClient';

interface VersionHistoryDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (version: GifProjectVersion) => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  projectId,
  isOpen,
  onClose,
  onRestoreVersion,
}) => {
  const [versions, setVersions] = useState<GifProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    gifApi
      .getProjectVersions(projectId)
      .then((data) => setVersions(data))
      .catch((err) => console.error('Failed to load project versions:', err))
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div className="gif-modal-backdrop" onClick={onClose}>
      <div className="gif-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--gif-border)',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>VERSION SNAPSHOTS</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gif-text-secondary)',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--gif-text-muted)' }}>
              Loading snapshots...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--gif-text-muted)' }}>
              No previous version snapshots found.
            </div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                style={{
                  background: 'var(--gif-bg-elevated)',
                  border: '1px solid var(--gif-border)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Snapshot #{ver.versionNumber}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gif-text-muted)', marginTop: 2 }}>
                    {ver.animationConfiguration?.effects?.length || 0} Effects • Seed: {ver.randomSeed}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--gif-text-secondary)', marginTop: 2 }}>
                    {new Date(ver.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onRestoreVersion(ver);
                    onClose();
                  }}
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: 'var(--gif-accent-purple)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  RESTORE
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
