import React, { useState } from 'react';
import { useReadmeBuilder } from '../hooks/useReadmeBuilder';
import { ReadmeBuilderHeader } from '../components/readme/ReadmeBuilderHeader';
import { ActiveSectionsList } from '../components/readme/ActiveSectionsList';
import { SectionConfigInspector } from '../components/readme/SectionConfigInspector';
import { SectionLibrary } from '../components/readme/SectionLibrary';
import { LivePreviewPanel } from '../components/readme/LivePreviewPanel';
import { MarkdownViewPanel } from '../components/readme/MarkdownViewPanel';
import { ThemeSelectorModal } from '../components/readme/ThemeSelectorModal';
import { TemplateSelectorModal } from '../components/readme/TemplateSelectorModal';
import { ConflictModal } from '../components/readme/ConflictModal';
import { ValidationBanner } from '../components/readme/ValidationBanner';
import { PublishModal } from '../components/readme/PublishModal';
import { PublicationHistoryModal } from '../components/readme/PublicationHistoryModal';

interface ReadmeBuilderPageProps {
  draftId: string;
  onBackToDashboard: () => void;
}

export const ReadmeBuilderPage: React.FC<ReadmeBuilderPageProps> = ({
  draftId,
  onBackToDashboard,
}) => {
  const {
    draft,
    components,
    themes,
    templates,
    selectedSectionId,
    selectedSection,
    selectedComponentDef,
    preview,
    isLoading,
    isPreviewLoading,
    saveStatus,
    errorMessage,
    conflictServerRevision,
    isDirty,
    canUndo,
    canRedo,
    setSelectedSectionId,
    addSection,
    removeSection,
    toggleSectionEnabled,
    moveSection,
    duplicateSection,
    updateSectionConfig,
    changeTheme,
    updateDraftName,
    applyTemplate,
    save,
    undo,
    redo,
    reloadServerDraft,
    copyMarkdown,
    validate,
  } = useReadmeBuilder(draftId);

  // UI state
  const [leftTab, setLeftTab] = useState<'sections' | 'library' | 'configure'>('sections');
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <svg className="w-10 h-10 animate-spin text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold text-white">Loading Visual README Builder...</p>
        <p className="text-xs text-slate-500 mt-1">Resolving components, themes, and authoritative data</p>
      </div>
    );
  }

  if (errorMessage && !draft) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-white mb-1">Failed to load draft</h2>
        <p className="text-xs text-rose-300 max-w-sm mb-6">{errorMessage}</p>
        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentTheme = themes.find((t) => t.themeKey === draft?.themeId);
  const currentTemplate = templates.find((t) => t.templateKey === draft?.templateId);

  const handleSelectSectionFromList = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setLeftTab('configure');
  };

  const handleAddComponent = (componentKey: string) => {
    addSection(componentKey);
    setLeftTab('configure');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Builder Top Bar Header */}
      <ReadmeBuilderHeader
        draftName={draft?.name || 'Untitled README'}
        themeName={currentTheme?.name || draft?.themeId || 'Default Theme'}
        templateName={currentTemplate?.name || draft?.templateId || 'Custom'}
        saveStatus={saveStatus}
        isDirty={isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        onUpdateName={updateDraftName}
        onSave={save}
        onUndo={undo}
        onRedo={redo}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onCopyMarkdown={copyMarkdown}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onBack={onBackToDashboard}
      />

      {/* Validation Banner (if validation errors exist) */}
      <ValidationBanner
        errors={preview?.validation?.errors || []}
        onSelectSection={handleSelectSectionFromList}
      />

      {/* 3-Region Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Region: Sections & Configuration Sidebar */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col border-r border-slate-800 bg-slate-900 z-10">
          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1 select-none">
            <button
              type="button"
              onClick={() => setLeftTab('sections')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                leftTab === 'sections'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Sections ({draft?.sections.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('configure')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                leftTab === 'configure'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Configure
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('library')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                leftTab === 'library'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Add Components
            </button>
          </div>

          {/* Sub-tab Content Panels */}
          <div className="flex-1 overflow-hidden">
            {leftTab === 'sections' && (
              <ActiveSectionsList
                sections={draft?.sections || []}
                components={components}
                selectedSectionId={selectedSectionId}
                onSelectSection={handleSelectSectionFromList}
                onToggleEnabled={toggleSectionEnabled}
                onMoveSection={moveSection}
                onDuplicateSection={duplicateSection}
                onRemoveSection={removeSection}
                onOpenLibrary={() => setLeftTab('library')}
              />
            )}

            {leftTab === 'configure' && (
              <SectionConfigInspector
                section={selectedSection}
                componentDef={selectedComponentDef}
                onUpdateConfig={updateSectionConfig}
                validationError={
                  preview?.validation?.errors?.find((e) => e.sectionId === selectedSectionId)?.reason
                }
              />
            )}

            {leftTab === 'library' && (
              <SectionLibrary
                components={components}
                onAddComponent={handleAddComponent}
              />
            )}
          </div>
        </div>

        {/* Right Region: Live Preview & Canonical Markdown Panel */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* View Mode Tabs (Preview / Markdown) */}
          <div className="h-12 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between select-none">
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Live Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'markdown'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Canonical Markdown</span>
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await validate();
                if (res.valid) {
                  alert('README draft validation passed successfully with 0 errors.');
                }
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Validate Draft</span>
            </button>
          </div>

          {/* Main Output View */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'preview' ? (
              <LivePreviewPanel
                preview={preview}
                isLoading={isPreviewLoading}
                themeId={draft?.themeId || 'github-dark'}
              />
            ) : (
              <MarkdownViewPanel
                markdown={preview?.markdown || ''}
                onCopy={copyMarkdown}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        themes={themes}
        currentThemeId={draft?.themeId || 'github-dark'}
        onSelectTheme={changeTheme}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <TemplateSelectorModal
        isOpen={isTemplateModalOpen}
        templates={templates}
        currentTemplateId={draft?.templateId || null}
        onApplyTemplate={applyTemplate}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <ConflictModal
        isOpen={saveStatus === 'conflict'}
        serverRevision={conflictServerRevision}
        onReloadServer={reloadServerDraft}
        onClose={() => saveStatus === 'conflict'}
      />

      {draft && (
        <>
          <PublishModal
            draft={draft}
            isOpen={isPublishModalOpen}
            onClose={() => setIsPublishModalOpen(false)}
          />

          <PublicationHistoryModal
            draft={draft}
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        </>
      )}
    </div>
  );
};
