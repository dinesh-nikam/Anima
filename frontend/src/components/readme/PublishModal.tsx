import React, { useState, useEffect } from 'react';
import { readmeApi } from '../../services/readmeApi';
import type {
  ReadmeDraft,
  TargetRepositoryItem,
  BranchItem,
  PublishPreviewResponse,
  PublicationReceipt,
} from '../../types/readme';

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
    `docs: update README via VeriFlow`,
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

        // Try to pick default target (repo named after user login or first repo)
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
          setSelectedBranch(repos[0].defaultBranch || 'main');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load GitHub repositories');
        setErrorCode(err.code);
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

  // Step 1: Generate Preview
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate publication preview');
      setErrorCode(err.code);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Step 2: Confirm & Publish
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Publication failed');
      setErrorCode(err.code);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Publish to GitHub</h2>
              <p className="text-xs text-slate-400">
                Safely review and deploy your profile README to GitHub
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

        {/* Step Indicator */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/40 px-6 py-2 text-xs text-slate-400">
          <div className={`flex items-center gap-1.5 ${step === 'TARGET' ? 'font-medium text-emerald-400' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">1</span>
            Target Selection
          </div>
          <span className="mx-3 text-slate-700">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'PREVIEW' ? 'font-medium text-emerald-400' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">2</span>
            Diff Review
          </div>
          <span className="mx-3 text-slate-700">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'CONFIRM' || step === 'PUBLISHING' ? 'font-medium text-emerald-400' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">3</span>
            Confirmation
          </div>
          <span className="mx-3 text-slate-700">→</span>
          <div className={`flex items-center gap-1.5 ${step === 'SUCCESS' ? 'font-medium text-emerald-400' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">4</span>
            Completed
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-200">
            <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-red-300">
                {errorCode === 'STALE_PREVIEW'
                  ? 'Stale Preview Detected'
                  : errorCode === 'GITHUB_AUTH_REQUIRED'
                  ? 'GitHub Reauthorization Required'
                  : errorCode === 'BRANCH_PROTECTED'
                  ? 'Branch Protection Restriction'
                  : 'Publication Error'}
              </div>
              <div className="text-xs text-red-200/90">{errorMessage}</div>
              {errorCode === 'STALE_PREVIEW' && (
                <button
                  onClick={handleGeneratePreview}
                  className="mt-2 rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 ring-1 ring-red-500/40"
                >
                  Regenerate Preview
                </button>
              )}
              {errorCode === 'GITHUB_AUTH_REQUIRED' && (
                <a
                  href="/api/v1/auth/github"
                  className="mt-2 inline-block rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 ring-1 ring-red-500/40"
                >
                  Reauthorize with GitHub
                </a>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: TARGET SELECTION */}
          {step === 'TARGET' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target GitHub Repository
                </label>
                {loadingRepos ? (
                  <div className="flex h-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400">
                    Loading repositories...
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-300">
                    No repositories found. Please synchronize your GitHub account.
                  </div>
                ) : (
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Branch
                  </label>
                  {loadingBranches ? (
                    <div className="flex h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400">
                      Loading branches...
                    </div>
                  ) : (
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    File Path
                  </label>
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="README.md"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="docs: update README via VeriFlow"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-semibold text-slate-200">Safe Two-Phase Publication</span>
                </div>
                <p className="mt-1">
                  Clicking <strong>Review Changes & Diff</strong> fetches the latest content from GitHub and generates a line-by-line comparison. No changes are committed until you explicitly confirm.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: DIFF REVIEW */}
          {step === 'PREVIEW' && previewData && (
            <div className="space-y-4">
              {/* Diff Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      previewData.changeStatus === 'CREATED'
                        ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                        : previewData.changeStatus === 'UNCHANGED'
                        ? 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                    }`}
                  >
                    {previewData.changeStatus === 'CREATED'
                      ? 'NEW FILE'
                      : previewData.changeStatus === 'UNCHANGED'
                      ? 'NO CHANGES'
                      : 'MODIFIED'}
                  </span>
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">
                      {previewData.target.owner}/{previewData.target.repo}
                    </span>{' '}
                    on branch <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-400">{previewData.target.branch}</code>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-emerald-400">+{previewData.diff.summary.additions} lines</span>
                  <span className="text-red-400">-{previewData.diff.summary.deletions} lines</span>
                  <span className="text-slate-500">({previewData.diff.summary.unchanged} unchanged)</span>
                </div>
              </div>

              {previewData.changeStatus === 'UNCHANGED' && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-300">
                  ℹ️ The rendered README is identical to the current GitHub README. Confirming will record a verified no-op without creating redundant commits.
                </div>
              )}

              {/* Diff Viewer */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 py-2 text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Path:</span>
                    <span className="text-slate-200 font-semibold">{previewData.target.path}</span>
                    <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDiffViewMode('unified')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          diffViewMode === 'unified' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Unified
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffViewMode('split')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          diffViewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Split
                      </button>
                    </div>
                  </div>
                  {previewData.currentSha && (
                    <div className="text-[11px] text-slate-500">
                      GitHub SHA: <code className="text-slate-400">{previewData.currentSha.substring(0, 7)}</code>
                    </div>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto p-2">
                  {previewData.diff.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-2 py-0.5 rounded leading-relaxed ${
                        line.type === 'ADDED'
                          ? 'bg-emerald-950/40 text-emerald-300'
                          : line.type === 'REMOVED'
                          ? 'bg-red-950/40 text-red-300'
                          : line.type === 'HEADER'
                          ? 'text-slate-500 italic py-1'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="w-8 shrink-0 select-none text-right text-[10px] text-slate-600">
                        {line.oldLineNumber || ''}
                      </span>
                      <span className="w-8 shrink-0 select-none text-right text-[10px] text-slate-600">
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

              {/* Confirmation Checkbox */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={(e) => setConfirmedCheck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">
                      I have reviewed the changes and confirm publication
                    </span>
                    <p className="mt-0.5 text-slate-400">
                      This will write to <code className="text-emerald-400">{previewData.target.owner}/{previewData.target.repo}</code> on branch <code className="text-emerald-400">{previewData.target.branch}</code>. An internal backup of the previous content is created automatically.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {step === 'SUCCESS' && receipt && (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  {receipt.isNoOp ? 'README Verified (No Changes Needed)' : 'Successfully Published to GitHub!'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {receipt.isNoOp
                    ? 'Target README was already up to date with this draft version.'
                    : `Commit created and pushed to ${receipt.target.owner}/${receipt.target.repo}@${receipt.target.branch}`}
                </p>
              </div>

              {/* Receipt Details Box */}
              <div className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-950/80 p-5 text-left text-xs space-y-3 font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Repository</span>
                  <span className="text-slate-200">{receipt.target.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Branch</span>
                  <span className="text-emerald-400">{receipt.target.branch}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">File Path</span>
                  <span className="text-slate-200">{receipt.target.path}</span>
                </div>
                {receipt.commitSha && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Commit SHA</span>
                    <span className="text-purple-400">{receipt.commitSha.substring(0, 7)}</span>
                  </div>
                )}
                {receipt.publishedFileSha && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">File SHA</span>
                    <span className="text-slate-300">{receipt.publishedFileSha.substring(0, 7)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="text-slate-400">{new Date(receipt.completedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                {receipt.commitUrl && (
                  <a
                    href={receipt.commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                  >
                    View Commit on GitHub ↗
                  </a>
                )}
                <a
                  href={`https://github.com/${receipt.target.owner}/${receipt.target.repo}/blob/${receipt.target.branch}/${receipt.target.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  View README on GitHub ↗
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-4">
          {step === 'TARGET' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingPreview || !selectedRepo}
                onClick={handleGeneratePreview}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
              >
                {loadingPreview ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating Diff...
                  </>
                ) : (
                  'Review Changes & Diff →'
                )}
              </button>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <button
                type="button"
                onClick={() => setStep('TARGET')}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                ← Back to Target
              </button>
              <button
                type="button"
                disabled={!confirmedCheck || publishing}
                onClick={handleConfirmPublish}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
              >
                {publishing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Writing to GitHub...
                  </>
                ) : (
                  '🚀 Confirm & Publish to GitHub'
                )}
              </button>
            </>
          )}

          {step === 'SUCCESS' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
