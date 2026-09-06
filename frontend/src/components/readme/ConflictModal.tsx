import React from 'react';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-rose-950/50">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-base font-bold text-white tracking-tight">
          Save Conflict Detected (HTTP 409)
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Your draft has been modified by another session or browser tab. The server is currently on revision{' '}
          <strong className="text-rose-400 font-mono font-bold">#{serverRevision || 'newer'}</strong>.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          To prevent accidental data loss, please reload the latest server version before making further changes.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReloadServer}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-lg shadow-rose-600/30"
          >
            Reload Server Version
          </button>
        </div>
      </div>
    </div>
  );
};
