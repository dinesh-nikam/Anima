import React, { useEffect, useState } from 'react';
import type { GifProjectVersion } from '../../types/gif';
import { gifApi } from '../../api/gifClient';
import { ModalShell, ConsoleButton, TickLabel } from '../ui/primitives';

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
    <ModalShell isOpen={isOpen} onClose={onClose} title="VERSION SNAPSHOTS" eyebrow="HISTORY · RESTORE POINT" maxWidth="max-w-md">
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-6 w-[2px] bg-signal-500/60 animate-pulse mb-3" aria-hidden="true" />
            <TickLabel>LOADING SNAPSHOTS…</TickLabel>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-10 text-center font-mono text-xs text-console-400">
            No previous version snapshots found.
          </div>
        ) : (
          versions.map((ver) => (
            <div
              key={ver.id}
              className="bg-carbon-800 border border-console-700 rounded-panel p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-console-100">
                  Snapshot #{ver.versionNumber}
                </div>
                <div className="font-mono text-[11px] text-console-400 mt-1">
                  {ver.animationConfiguration?.effects?.length || 0} Effects · Seed: {ver.randomSeed}
                </div>
                <div className="font-mono text-[10px] text-console-500 mt-1">
                  {new Date(ver.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <ConsoleButton
                variant="secondary"
                onClick={() => {
                  onRestoreVersion(ver);
                  onClose();
                }}
                className="shrink-0 text-[10px] py-1.5 px-3"
              >
                RESTORE
              </ConsoleButton>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
};
