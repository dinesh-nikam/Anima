import React, { useState, useEffect } from 'react';
import type { ReadmeDraft, TemplateDefinition } from '../types/readme';
import { readmeApi } from '../services/readmeApi';

interface ReadmeDashboardProps {
  onOpenDraft: (draftId: string) => void;
}

export const ReadmeDashboard: React.FC<ReadmeDashboardProps> = ({ onOpenDraft }) => {
  const [drafts, setDrafts] = useState<ReadmeDraft[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Draft Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDraftName, setNewDraftName] = useState('My Profile README');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('professional-developer');
  const [isCreating, setIsCreating] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [loadedDrafts, loadedTemplates] = await Promise.all([
        readmeApi.listDrafts(),
        readmeApi.getTemplates(),
      ]);
      setDrafts(loadedDrafts);
      setTemplates(loadedTemplates);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-indigo-600/30">
            VF
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">VeriFlow</h1>
            <p className="text-[10px] text-slate-400 font-medium">Visual README Studio</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create README</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/50 border border-slate-800 p-8 relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              Phase 7 Visual Engine
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
              Interactive GitHub README Builder
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Design, preview, and refine production-grade GitHub profile READMEs powered by authoritative analytics, verified streaks, trophy walls, and dynamic Markdown rendering.
            </p>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">My README Drafts</h3>
            <p className="text-xs text-slate-400">Manage, edit, and duplicate your profile README configurations</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{drafts.length} draft{drafts.length === 1 ? '' : 's'}</span>
        </div>

        {/* Drafts Grid */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-500">
            <svg className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs">Loading drafts...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMessage}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl p-8">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">No README drafts found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Get started by creating your first profile README using our curated templates.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Create New README
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 transition-all flex flex-col justify-between group shadow-lg shadow-black/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {draft.name}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      rev #{draft.revision}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {draft.description || 'Custom profile README layout'}
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Template:</span>
                      <span className="font-semibold text-slate-200">{draft.templateId || 'Custom'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Theme:</span>
                      <span className="font-semibold text-indigo-400">{draft.themeId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Sections:</span>
                      <span className="font-mono text-slate-300">{draft.sections.length} configured</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDraft(draft.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-center cursor-pointer shadow-sm shadow-indigo-600/30"
                  >
                    Open Editor
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(draft.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Duplicate Draft"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(draft.id, draft.name)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Draft"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight mb-1">Create New README</h3>
            <p className="text-xs text-slate-400 mb-6">Choose a title and starting template layout.</p>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Draft Name</label>
                <input
                  type="text"
                  value={newDraftName}
                  onChange={(e) => setNewDraftName(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Starting Template</label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {templates.map((t) => (
                    <option key={t.templateKey} value={t.templateKey}>
                      {t.name} ({t.sections.length} sections)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {isCreating ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
