import React, { useState, useEffect } from 'react';
import { getGithubConnectUrl, readmeApi } from '../../services/readmeApi';
import type {
  ReadmeDraft,
  TargetRepositoryItem,
  BranchItem,
  PublishPreviewResponse,
  PublicationReceipt,
} from '../../types/readme';
import { ModalShell, ConsoleButton, ConsoleBadge } from '../ui/primitives';

interface PublishModalProps {
  draft: ReadmeDraft;
  isOpen: boolean;
  onClose: () => void;
  onPublished?: (receipt: PublicationReceipt) => void;
}

type Step = 'TARGET' | 'PREVIEW' | 'CONFIRM' | 'PUBLISHING' | 'SUCCESS';

export const PublishModal: React.FC<PublishModalProps> = ({
  draft,
  isOpen,
  onClose,
  onPublished,
}) => {
  const [step, setStep] = useState<Step>('TARGET');
  const [repositories, setRepositories] = useState<TargetRepositoryItem[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('README.md');
  const [commitMessage, setCommitMessage] = useState<string>(
    `docs: update README via Anima`,
  );

  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<PublishPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<PublicationReceipt | null>(null);

  const [confirmedCheck, setConfirmedCheck] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');

  // Load repositories on open
  useEffect(() => {
    if (!isOpen) return;

    setStep('TARGET');
    setPreviewData(null);
    setReceipt(null);
    setConfirmedCheck(false);
    setErrorMessage(null);
    setErrorCode(null);

    const loadTargets = async () => {
      setLoadingRepos(true);
      try {
        const repos = await readmeApi.getTargetRepositories();
        setRepositories(repos);

        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
          setSelectedBranch(repos[0].defaultBranch || 'main');
        }
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string };
        setErrorMessage(e.message || 'Failed to load GitHub repositories');
        setErrorCode(e.code || null);
      } finally {
        setLoadingRepos(false);
      }
    };

    loadTargets();
  }, [isOpen]);

  // Load branches when selected repo changes
  useEffect(() => {
    const selected = repositories.find((r) => r.id === selectedRepoId);
    if (!selected) return;

    let isCancelled = false;

    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const branchList = await readmeApi.getTargetBranches(selected.owner, selected.name);
        if (!isCancelled) {
          setBranches(branchList);
          if (branchList.length > 0) {
            setSelectedBranch((prev) => {
              if (branchList.some((b) => b.name === prev)) return prev;
              return selected.defaultBranch || branchList[0].name;
            });
          }
        }
      } catch {
        if (!isCancelled) {
          setBranches([{ name: selected.defaultBranch || 'main', commit: { sha: '', url: '' }, protected: false }]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingBranches(false);
        }
      }
    };

    loadBranches();

    return () => {
      isCancelled = true;
    };
  }, [selectedRepoId, repositories]);

  if (!isOpen) return null;

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId);

  const handleGeneratePreview = async () => {
    if (!selectedRepo) return;
    setLoadingPreview(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const preview = await readmeApi.createPublishPreview(draft.id, {
        repositoryId: selectedRepo.id,
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        branch: selectedBranch,
        path: customPath.trim() || 'README.md',
        commitMessage: commitMessage.trim(),
      });

      setPreviewData(preview);
      setStep('PREVIEW');
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      setErrorMessage(e.message || 'Failed to generate publication preview');
      setErrorCode(e.code || null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!previewData || !confirmedCheck) return;
    setPublishing(true);
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const result = await readmeApi.confirmPublish(draft.id, {
        intentId: previewData.intentId,
        commitMessage: commitMessage.trim(),
      });

      setReceipt(result);
      setStep('SUCCESS');
      if (onPublished) {
        onPublished(result);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      setErrorMessage(e.message || 'Publication failed');
      setErrorCode(e.code || null);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Publish to GitHub" eyebrow="PUBLISH · SAFE TWO-PHASE" maxWidth="max-w-4xl">
      <div className="flex flex-col gap-4 -m-6">
        {/* Step Indicator — console segmented */}
        <div className="flex border-b border-console-700 bg-carbon-950/40 px-6 py-2 font-mono text-[11px] font-bold uppercase tracking-wide">
          <div className={`flex items-center gap-1.5 ${step === 'TARGET' ? 'text-signal-400' : 'text-console-500'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-tick border text-[10px] ${step === 'TARGET' ? 'border-signal-500 text-signal-500' : 'border-console-600'}`}>1</span>
            Target
          </div>
          <span className="mx-3 text-console-600">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'PREVIEW' ? 'text-signal-400' : 'text-console-500'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-tick border text-[10px] ${step === 'PREVIEW' ? 'border-signal-500 text-signal-500' : 'border-console-600'}`}>2</span>
            Diff Review
          </div>
          <span className="mx-3 text-console-600">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'CONFIRM' || step === 'PUBLISHING' ? 'text-signal-400' : 'text-console-500'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-tick border text-[10px] ${step === 'CONFIRM' || step === 'PUBLISHING' ? 'border-signal-500 text-signal-500' : 'border-console-600'}`}>3</span>
            Confirmation
          </div>
          <span className="mx-3 text-console-600">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'SUCCESS' ? 'text-signal-400' : 'text-console-500'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-tick border text-[10px] ${step === 'SUCCESS' ? 'border-signal-500 text-signal-500' : 'border-console-600'}`}>4</span>
            Completed
          </div>
        </div>

        {/* Error Alert Banner — alert instrument-panel */}
        {errorMessage && (
          <div className="mx-6 flex items-start gap-3 rounded-tick border border-alert-500/30 bg-alert-500/10 p-3.5 font-mono text-sm text-alert-400">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-bold uppercase tracking-wide text-xs">
                {errorCode === 'STALE_PREVIEW'
                  ? 'Stale Preview Detected'
                  : errorCode === 'GITHUB_AUTH_REQUIRED'
                  ? 'GitHub Reauthorization Required'
                  : errorCode === 'BRANCH_PROTECTED'
                  ? 'Branch Protection Restriction'
                  : 'Publication Error'}
              </div>
              <div className="text-xs text-alert-400/90 mt-1">{errorMessage}</div>
              {errorCode === 'STALE_PREVIEW' && (
                <ConsoleButton variant="secondary" onClick={handleGeneratePreview} className="mt-2">
                  Regenerate Preview
                </ConsoleButton>
              )}
              {errorCode === 'GITHUB_AUTH_REQUIRED' && (
                <a
                  href={getGithubConnectUrl()}
                  className="mt-2 inline-flex console-btn-secondary"
                >
                  Reconnect GitHub account
                </a>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-6 pb-2 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: TARGET SELECTION */}
          {step === 'TARGET' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block tick-label">
                  Target GitHub Repository
                </label>
                {loadingRepos ? (
                  <div className="flex h-12 items-center justify-center rounded-tick border border-console-700 bg-carbon-950 font-mono text-xs text-console-400">
                    Loading repositories…
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="rounded-tick border border-hazard-500/30 bg-hazard-500/10 p-4 font-mono text-xs text-hazard-400">
                    No repositories found. Please synchronize your GitHub account.
                  </div>
                ) : (
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="w-full rounded-tick border border-console-600 bg-carbon-950 px-3.5 py-2.5 font-mono text-sm text-console-100 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  >
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id} disabled={!repo.canWrite}>
                        {repo.fullName} {repo.visibility === 'PRIVATE' ? '🔒 (Private)' : '🌐 (Public)'}
                        {!repo.canWrite ? ' [Read-Only / Archived]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block tick-label">
                    Branch
                  </label>
                  {loadingBranches ? (
                    <div className="flex h-10 items-center justify-center rounded-tick border border-console-700 bg-carbon-950 font-mono text-xs text-console-400">
                      Loading branches…
                    </div>
                  ) : (
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full rounded-tick border border-console-600 bg-carbon-950 px-3.5 py-2.5 font-mono text-sm text-console-100 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name} {b.protected ? '🛡️ (Protected)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-2 block tick-label">
                    File Path
                  </label>
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="README.md"
                    className="w-full rounded-tick border border-console-600 bg-carbon-950 px-3.5 py-2.5 font-mono text-sm text-console-100 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block tick-label">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="docs: update README via Anima"
                  className="w-full rounded-tick border border-console-600 bg-carbon-950 px-3.5 py-2.5 font-mono text-sm text-console-100 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                />
              </div>

              <div className="instrument-panel p-4">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-signal-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Safe Two-Phase Publication</span>
                </div>
                <p className="mt-1 font-mono text-xs text-console-400">
                  Clicking <strong className="text-console-200">Review Changes & Diff</strong> fetches the latest content from GitHub and generates a line-by-line comparison. No changes are committed until you explicitly confirm.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: DIFF REVIEW */}
          {step === 'PREVIEW' && previewData && (
            <div className="space-y-4">
              {/* Diff Header Bar — instrument-panel */}
              <div className="flex flex-wrap items-center justify-between gap-3 instrument-panel p-4">
                <div className="flex items-center gap-3">
                  <ConsoleBadge tone={previewData.changeStatus === 'CREATED' ? 'default' : previewData.changeStatus === 'UNCHANGED' ? 'default' : 'accent'}>
                    {previewData.changeStatus === 'CREATED'
                      ? 'NEW FILE'
                      : previewData.changeStatus === 'UNCHANGED'
                      ? 'NO CHANGES'
                      : 'MODIFIED'}
                  </ConsoleBadge>
                  <div className="font-mono text-xs text-console-300">
                    <span className="font-bold text-console-100">
                      {previewData.target.owner}/{previewData.target.repo}
                    </span>{' '}
                    on branch <code className="rounded-tick bg-carbon-800 border border-console-600 px-1 py-0.5 text-signal-400">{previewData.target.branch}</code>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-signal-400">+{previewData.diff.summary.additions} lines</span>
                  <span className="text-alert-400">-{previewData.diff.summary.deletions} lines</span>
                  <span className="text-console-500">({previewData.diff.summary.unchanged} unchanged)</span>
                </div>
              </div>

              {previewData.changeStatus === 'UNCHANGED' && (
                <div className="rounded-tick border border-console-600 bg-carbon-800 p-4 font-mono text-xs text-console-400">
                  ℹ️ The rendered README is identical to the current GitHub README. Confirming will record a verified no-op without creating redundant commits.
                </div>
              )}

              {/* Diff Viewer — instrument-panel framed */}
              <div className="overflow-hidden instrument-panel font-mono text-xs">
                <div className="flex items-center justify-between border-b border-console-700 bg-carbon-900 px-4 py-2 text-console-400">
                  <div className="flex items-center gap-3">
                    <span className="tick-label">Path: {previewData.target.path}</span>
                    <div className="flex items-center rounded-tick bg-carbon-950 p-0.5 border border-console-700">
                      <button
                        type="button"
                        onClick={() => setDiffViewMode('unified')}
                        className={`px-2 py-0.5 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                          diffViewMode === 'unified' ? 'bg-signal-500 text-carbon-950' : 'text-console-500 hover:text-console-300'
                        }`}
                      >
                        Unified
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffViewMode('split')}
                        className={`px-2 py-0.5 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                          diffViewMode === 'split' ? 'bg-signal-500 text-carbon-950' : 'text-console-500 hover:text-console-300'
                        }`}
                      >
                        Split
                      </button>
                    </div>
                  </div>
                  {previewData.currentSha && (
                    <div className="font-mono text-[11px] text-console-500">
                      SHA: <code className="text-console-400">{previewData.currentSha.substring(0, 7)}</code>
                    </div>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto p-2 bg-carbon-950">
                  {previewData.diff.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-2 py-0.5 rounded-tick leading-relaxed ${
                        line.type === 'ADDED'
                          ? 'bg-signal-500/10 text-signal-400'
                          : line.type === 'REMOVED'
                          ? 'bg-alert-500/10 text-alert-400'
                          : line.type === 'HEADER'
                          ? 'text-console-500 italic py-1'
                          : 'text-console-400'
                      }`}
                    >
                      <span className="w-8 shrink-0 select-none text-right text-[10px] text-console-600">
                        {line.oldLineNumber || ''}
                      </span>
                      <span className="w-8 shrink-0 select-none text-right text-[10px] text-console-600">
                        {line.newLineNumber || ''}
                      </span>
                      <span className="w-4 shrink-0 select-none font-bold">
                        {line.type === 'ADDED' ? '+' : line.type === 'REMOVED' ? '-' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all">{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox — instrument-panel */}
              <div className="instrument-panel p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={(e) => setConfirmedCheck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-tick border-console-600 bg-carbon-900 text-signal-500 focus:ring-signal-500"
                  />
                  <div className="font-mono text-xs text-console-300">
                    <span className="font-bold text-console-100 uppercase tracking-wide">
                      I have reviewed the changes and confirm publication
                    </span>
                    <p className="mt-0.5 text-console-400">
                      This will write to <code className="text-signal-400">{previewData.target.owner}/{previewData.target.repo}</code> on branch <code className="text-signal-400">{previewData.target.branch}</code>. An internal backup of the previous content is created automatically.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SUCCESS RECEIPT */}
          {step === 'SUCCESS' && receipt && (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center bg-signal-500 text-carbon-950 rounded-tick">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-console-100">
                  {receipt.isNoOp ? 'README Verified (No Changes Needed)' : 'Successfully Published to GitHub!'}
                </h3>
                <p className="mt-1 font-mono text-xs text-console-400">
                  {receipt.isNoOp
                    ? 'Target README was already up to date with this draft version.'
                    : `Commit created and pushed to ${receipt.target.owner}/${receipt.target.repo}@${receipt.target.branch}`}
                </p>
              </div>

              {/* Receipt Details Box — instrument-panel */}
              <div className="mx-auto max-w-lg instrument-panel p-5 text-left font-mono text-xs space-y-3">
                <div className="flex justify-between border-b border-console-700 pb-2">
                  <span className="text-console-500">Repository</span>
                  <span className="text-console-100">{receipt.target.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-console-700 pb-2">
                  <span className="text-console-500">Branch</span>
                  <span className="text-signal-400">{receipt.target.branch}</span>
                </div>
                <div className="flex justify-between border-b border-console-700 pb-2">
                  <span className="text-console-500">File Path</span>
                  <span className="text-console-100">{receipt.target.path}</span>
                </div>
                {receipt.commitSha && (
                  <div className="flex justify-between border-b border-console-700 pb-2">
                    <span className="text-console-500">Commit SHA</span>
                    <span className="text-console-300">{receipt.commitSha.substring(0, 7)}</span>
                  </div>
                )}
                {receipt.publishedFileSha && (
                  <div className="flex justify-between border-b border-console-700 pb-2">
                    <span className="text-console-500">File SHA</span>
                    <span className="text-console-300">{receipt.publishedFileSha.substring(0, 7)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-console-500">Timestamp</span>
                  <span className="text-console-400">{new Date(receipt.completedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                {receipt.commitUrl && (
                  <a
                    href={receipt.commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="console-btn-secondary"
                  >
                    View Commit ↗
                  </a>
                )}
                <a
                  href={`https://github.com/${receipt.target.owner}/${receipt.target.repo}/blob/${receipt.target.branch}/${receipt.target.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="console-btn-primary"
                >
                  View README ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-console-700 bg-carbon-950/60 px-6 py-4">
          {step === 'TARGET' && (
            <>
              <ConsoleButton variant="secondary" onClick={onClose}>
                Cancel
              </ConsoleButton>
              <ConsoleButton variant="primary" disabled={loadingPreview || !selectedRepo} onClick={handleGeneratePreview}>
                {loadingPreview ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating Diff…
                  </>
                ) : (
                  'Review Changes & Diff →'
                )}
              </ConsoleButton>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <ConsoleButton variant="secondary" onClick={() => setStep('TARGET')}>
                ← Back to Target
              </ConsoleButton>
              <ConsoleButton variant="primary" disabled={!confirmedCheck || publishing} onClick={handleConfirmPublish}>
                {publishing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Writing to GitHub…
                  </>
                ) : (
                  'Confirm & Publish to GitHub'
                )}
              </ConsoleButton>
            </>
          )}

          {step === 'SUCCESS' && (
            <div className="w-full flex justify-end">
              <ConsoleButton variant="secondary" onClick={onClose}>
                Done
              </ConsoleButton>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
