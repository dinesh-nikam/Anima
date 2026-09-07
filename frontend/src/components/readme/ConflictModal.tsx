import React from 'react';
import { ModalShell, ConsoleButton } from '../ui/primitives';

interface ConflictModalProps {
  isOpen: boolean;
  serverRevision: number | null;
  onReloadServer: () => void;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  serverRevision,
  onReloadServer,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Save Conflict Detected (HTTP 409)" eyebrow="CONFLICT · REVISION MISMATCH" maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="w-10 h-10 bg-alert-500/10 border border-alert-500/30 flex items-center justify-center text-alert-400 rounded-tick">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <p className="font-mono text-xs text-console-300 leading-relaxed">
          Your draft has been modified by another session or browser tab. The server is currently on revision{' '}
          <strong className="text-alert-400 font-mono font-bold">#{serverRevision || 'newer'}</strong>.
        </p>
        <p className="font-mono text-xs text-console-500">
          To prevent accidental data loss, please reload the latest server version before making further changes.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <ConsoleButton variant="secondary" onClick={onClose}>
            Cancel
          </ConsoleButton>
          <ConsoleButton variant="primary" onClick={onReloadServer}>
            Reload Server Version
          </ConsoleButton>
        </div>
      </div>
    </ModalShell>
  );
};
