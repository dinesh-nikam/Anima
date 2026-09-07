import React, { useState, useEffect } from 'react';
import { readmeApi } from '../../services/readmeApi';
import type { ReadmeDraft, PublicationReceipt } from '../../types/readme';
import { ModalShell, ConsoleBadge, ConsoleButton } from '../ui/primitives';

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
      } catch (err: unknown) {
        const e = err as { message?: string };
        setErrorMessage(e.message || 'Failed to load publication history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, draft.id]);

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Publication History" eyebrow="HISTORY · AUDIT LOG" maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4 -m-6">
        <div className="px-6 pt-2">
          <p className="font-mono text-xs text-console-400">
            Audit log of all GitHub publishes for “{draft.name}”
          </p>
        </div>

        <div className="px-6 pb-2 max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center font-mono text-xs text-console-400">
              Loading publication history…
            </div>
          ) : errorMessage ? (
            <div className="rounded-tick border border-alert-500/30 bg-alert-500/10 p-4 font-mono text-xs text-alert-400">
              {errorMessage}
            </div>
          ) : publications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-console-700 rounded-panel bg-carbon-850">
              <div className="flex h-10 w-10 items-center justify-center bg-carbon-800 border border-console-600 text-console-500 mb-3 rounded-tick">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-mono text-sm font-bold text-console-100">No Publications Yet</p>
              <p className="font-mono text-xs text-console-500 mt-1 max-w-sm">
                This draft has not been published to GitHub yet. Click “Publish to GitHub” to deploy your README.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {publications.map((pub) => (
                <div
                  key={pub.publicationId}
                  className="flex flex-col gap-2 rounded-panel border border-console-700 bg-carbon-950 p-4 hover:border-console-600 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <ConsoleBadge tone={pub.status === 'PUBLISHED' ? 'accent' : pub.status === 'NO_CHANGES' ? 'default' : 'hazard'}>
                        {pub.status}
                      </ConsoleBadge>
                      <span className="font-bold text-console-100">
                        {pub.target.owner}/{pub.target.repo}
                      </span>
                      <span className="text-console-500">@</span>
                      <span className="text-signal-400">{pub.target.branch}</span>
                    </div>

                    <div className="font-mono text-[11px] text-console-500">
                      {new Date(pub.completedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-console-400 pt-2 border-t border-console-700">
                    <div className="flex items-center gap-3 text-[11px]">
                      {pub.commitSha && (
                        <span>
                          Commit: <code className="text-signal-400">{pub.commitSha.substring(0, 7)}</code>
                        </span>
                      )}
                      {pub.diffSummary && (
                        <span className="text-console-500">
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
                          className="console-btn-secondary px-2.5 py-1 text-[11px]"
                        >
                          View Commit ↗
                        </a>
                      )}
                      <a
                        href={`https://github.com/${pub.target.owner}/${pub.target.repo}/blob/${pub.target.branch}/${pub.target.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="console-btn-secondary px-2.5 py-1 text-[11px]"
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

        <div className="flex justify-end border-t border-console-700 bg-carbon-950/60 px-6 py-3">
          <ConsoleButton variant="secondary" onClick={onClose}>
            Close
          </ConsoleButton>
        </div>
      </div>
    </ModalShell>
  );
};
