import React, { useState, useEffect } from 'react';
import type { ReadmeDraft, TemplateDefinition } from '../types/readme';
import { getGithubConnectUrl, readmeApi } from '../services/readmeApi';
import {
  SignalHeader,
  CornerTicks,
  InstrumentPanel,
  ConsoleBadge,
  ConsoleButton,
  ConsoleIconButton,
  ModalShell,
  ConsoleSpinner,
  TickLabel,
  TickDivider,
} from '../components/ui/primitives';

interface ReadmeDashboardProps {
  onOpenDraft: (draftId: string) => void;
  onOpenGifStudio?: () => void;
}

export const ReadmeDashboard: React.FC<ReadmeDashboardProps> = ({ onOpenDraft, onOpenGifStudio }) => {
  const [drafts, setDrafts] = useState<ReadmeDraft[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [githubConnection, setGithubConnection] = useState<{
    connected: boolean;
    login?: string;
    avatarUrl?: string;
  }>({ connected: false });

  // New Draft Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('My Profile README');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('professional-developer');
  const [isCreating, setIsCreating] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [loadedDrafts, loadedTemplates, session] = await Promise.all([
        readmeApi.listDrafts(),
        readmeApi.getTemplates(),
        readmeApi.getSession(),
      ]);
      setDrafts(loadedDrafts);
      setTemplates(loadedTemplates);
      setGithubConnection(session.user?.github || { connected: false });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load drafts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftName.trim()) return;
    setIsCreating(true);
    try {
      const created = await readmeApi.createDraft({
        name: newDraftName.trim(),
        templateId: selectedTemplateKey,
      });
      setIsCreateModalOpen(false);
      setNewDraftName('My Profile README');
      onOpenDraft(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create draft');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (draftId: string) => {
    try {
      const duplicated = await readmeApi.duplicateDraft(draftId);
      await loadDashboardData();
      onOpenDraft(duplicated.id);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate draft');
    }
  };

  const handleDelete = async (draftId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await readmeApi.deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete draft');
    }
  };

  return (
    <div className="min-h-screen bg-carbon-950 text-console-100 flex flex-col">
      <SignalHeader
        brandMark="AN"
        brandLabel="Anima · Visual Console"
        live="PHASE 7 · VISUAL ENGINE"
        right={
          <>
            {githubConnection.connected ? (
              <ConsoleBadge>
                GitHub · {githubConnection.login || 'connected'}
              </ConsoleBadge>
            ) : (
              <ConsoleButton
                variant="secondary"
                onClick={() => window.location.assign(getGithubConnectUrl())}
                aria-label="Connect GitHub account"
              >
                <span aria-hidden="true">↗</span>
                <span>Connect GitHub</span>
              </ConsoleButton>
            )}
            {onOpenGifStudio && (
              <ConsoleButton
                variant="secondary"
                onClick={onOpenGifStudio}
                aria-label="Open GIF Animation Studio"
              >
                <span aria-hidden="true">◆</span>
                <span>GIF Animation Studio</span>
              </ConsoleButton>
            )}
            <ConsoleButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create README</span>
            </ConsoleButton>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Banner — scanline + corner-ticks differentiation anchor */}
        <div className="mb-8 console-rise console-rise-1">
          <CornerTicks className="scanline instrument-panel p-8 relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <TickLabel accent className="mb-3">
                PHASE 7 · VISUAL ENGINE
              </TickLabel>
              <h2 className="text-2xl font-display font-bold text-console-100 tracking-tight mb-2">
                Interactive GitHub README Builder
              </h2>
              <p className="text-xs text-console-300 leading-relaxed">
                Design, preview, and refine production-grade GitHub profile READMEs powered by authoritative analytics, verified streaks, trophy walls, and dynamic Markdown rendering.
              </p>
            </div>
          </CornerTicks>
        </div>

        <TickDivider className="mb-8" />

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6 console-rise console-rise-2">
          <div>
            <TickLabel className="mb-1">MY README DRAFTS</TickLabel>
            <h3 className="text-base font-display font-bold text-console-100 tracking-tight">My README Drafts</h3>
            <p className="text-xs text-console-400">Manage, edit, and duplicate your profile README configurations</p>
          </div>
          <span className="font-mono text-xs text-console-500">{drafts.length} draft{drafts.length === 1 ? '' : 's'}</span>
        </div>

        {/* Drafts Grid */}
        <div className="console-rise console-rise-3">
          {isLoading ? (
            <ConsoleSpinner label="Loading drafts..." />
          ) : errorMessage ? (
            <div className="p-6 rounded-panel bg-alert-500/10 border border-alert-500/30 text-alert-400 text-xs text-center font-mono">
              {errorMessage}
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-console-600 rounded-panel p-8 bg-carbon-850">
              <div className="w-12 h-12 rounded-tick bg-carbon-800 border border-console-600 flex items-center justify-center text-console-500 mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-display font-bold text-console-100 mb-1">No README drafts found</h4>
              <p className="text-xs text-console-400 max-w-sm mx-auto mb-4">
                Get started by creating your first profile README using our curated templates.
              </p>
              <ConsoleButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                Create New README
              </ConsoleButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map((draft) => (
                <InstrumentPanel
                  key={draft.id}
                  hover
                  className="p-6 flex flex-col justify-between group shadow-lg shadow-black/40"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-base font-display font-bold text-console-100 group-hover:text-signal-400 transition-colors truncate">
                        {draft.name}
                      </h4>
                      <ConsoleBadge>rev #{draft.revision}</ConsoleBadge>
                    </div>

                    <p className="text-xs text-console-400 line-clamp-2 mb-4">
                      {draft.description || 'Custom profile README layout'}
                    </p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between text-[11px] text-console-400">
                        <span>Template:</span>
                        <span className="font-semibold text-console-200">{draft.templateId || 'Custom'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-console-400">
                        <span>Theme:</span>
                        <span className="font-semibold text-signal-400">{draft.themeId}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-console-400">
                        <span>Sections:</span>
                        <span className="font-mono text-console-300">{draft.sections.length} configured</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-console-700 flex items-center justify-between gap-2">
                    <ConsoleButton
                      variant="primary"
                      onClick={() => onOpenDraft(draft.id)}
                      className="flex-1 py-2"
                    >
                      Open Editor
                    </ConsoleButton>

                    <ConsoleIconButton
                      onClick={() => handleDuplicate(draft.id)}
                      title="Duplicate Draft"
                      aria-label={`Duplicate draft ${draft.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </ConsoleIconButton>

                    <ConsoleIconButton
                      danger
                      onClick={() => handleDelete(draft.id, draft.name)}
                      title="Delete Draft"
                      aria-label={`Delete draft ${draft.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </ConsoleIconButton>
                  </div>
                </InstrumentPanel>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <ModalShell
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New README"
        eyebrow="NEW DRAFT"
      >
        <p className="text-xs text-console-400 mb-6">Choose a title and starting template layout.</p>

        <form onSubmit={handleCreateDraft} className="space-y-4">
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-console-300 block mb-1.5">
              Draft Name
            </label>
            <input
              type="text"
              value={newDraftName}
              onChange={(e) => setNewDraftName(e.target.value)}
              required
              maxLength={100}
              className="w-full bg-carbon-800 text-console-100 text-xs px-3 py-2.5 rounded-tick border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500 focus:border-signal-500"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-console-300 block mb-1.5">
              Starting Template
            </label>
            <select
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
              className="w-full bg-carbon-800 text-console-100 text-xs px-3 py-2.5 rounded-tick border border-console-600 focus:outline-none focus:ring-1 focus:ring-signal-500 focus:border-signal-500 cursor-pointer"
            >
              {templates.map((t) => (
                <option key={t.templateKey} value={t.templateKey}>
                  {t.name} ({t.sections.length} sections)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <ConsoleButton variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </ConsoleButton>
            <ConsoleButton variant="primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create & Open'}
            </ConsoleButton>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
