import React, { useState, useEffect } from 'react';
import { readmeApi } from '../../services/readmeApi';
import type { ReadmeDraft, PublicationReceipt } from '../../types/readme';

interface PublicationHistoryModalProps {
  draft: ReadmeDraft;
  isOpen: boolean;
  onClose: () => void;
}

export const PublicationHistoryModal: React.FC<PublicationHistoryModalProps> = ({
  draft,
  isOpen,
  onClose,
}) => {
  const [publications, setPublications] = useState<PublicationReceipt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadHistory = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await readmeApi.getDraftPublications(draft.id);
        setPublications(response.publications || []);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load publication history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, draft.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Publication History</h2>
              <p className="text-xs text-slate-400">
                Audit log of all GitHub publishes for &ldquo;{draft.name}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              Loading publication history...
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              {errorMessage}
            </div>
          ) : publications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-300">No Publications Yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                This draft has not been published to GitHub yet. Click &ldquo;Publish to GitHub&rdquo; to deploy your README.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {publications.map((pub) => (
                <div
                  key={pub.publicationId}
                  className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          pub.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                            : pub.status === 'NO_CHANGES'
                            ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                            : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                        }`}
                      >
                        {pub.status}
                      </span>
                      <span className="font-semibold text-white">
                        {pub.target.owner}/{pub.target.repo}
                      </span>
                      <span className="text-slate-500">@</span>
                      <span className="text-emerald-400">{pub.target.branch}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {new Date(pub.completedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      {pub.commitSha && (
                        <span>
                          Commit: <code className="text-purple-400">{pub.commitSha.substring(0, 7)}</code>
                        </span>
                      )}
                      {pub.diffSummary && (
                        <span className="text-slate-500">
                          (+{pub.diffSummary.additions} / -{pub.diffSummary.deletions})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pub.commitUrl && (
                        <a
                          href={pub.commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          View Commit ↗
                        </a>
                      )}
                      <a
                        href={`https://github.com/${pub.target.owner}/${pub.target.repo}/blob/${pub.target.branch}/${pub.target.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-slate-700 transition-colors"
                      >
                        View File ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 bg-slate-950/80 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
