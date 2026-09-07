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
import { ConsoleSpinner, ConsoleButton } from '../components/ui/primitives';

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
      <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center">
        <ConsoleSpinner label="Resolving components, themes, and authoritative data" />
        <p className="tick-label mt-2">LOADING VISUAL README BUILDER…</p>
      </div>
    );
  }

  if (errorMessage && !draft) {
    return (
      <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center p-6 text-center console-rise">
        <div className="instrument-panel max-w-md w-full p-8 flex flex-col items-center border-alert-500/30">
          <div className="w-12 h-12 bg-alert-500/10 border border-alert-500/30 flex items-center justify-center text-alert-400 mb-4 rounded-tick">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-console-100 mb-1">Failed to load draft</h2>
          <p className="text-xs text-alert-400 max-w-sm mb-6">{errorMessage}</p>
          <ConsoleButton variant="secondary" onClick={onBackToDashboard}>
            Return to Dashboard
          </ConsoleButton>
        </div>
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
    <div className="min-h-screen bg-carbon-950 text-console-100 flex flex-col overflow-hidden">
      {/* Builder Top Bar Header */}
      <div className="scanline">
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
        <div className="tick-divider" aria-hidden="true" />
      </div>

      {/* Validation Banner (if validation errors exist) */}
      <ValidationBanner
        errors={preview?.validation?.errors || []}
        onSelectSection={handleSelectSectionFromList}
      />

      {/* 3-Region Workspace */}
      <div className="flex-1 flex overflow-hidden console-rise">
        {/* Left Region: Sections & Configuration Sidebar */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col border-r border-console-700 bg-carbon-900 z-10 console-rise">
          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-console-700 bg-carbon-950/40 p-1.5 gap-1 select-none">
            <button
              type="button"
              onClick={() => setLeftTab('sections')}
              className={`flex-1 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide rounded-tick transition-colors cursor-pointer text-center border ${
                leftTab === 'sections'
                  ? 'bg-signal-500 text-carbon-950 border-signal-500'
                  : 'text-console-400 hover:text-console-100 hover:bg-carbon-800 border-transparent hover:border-console-600'
              }`}
            >
              SECTIONS ({draft?.sections.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('configure')}
              className={`flex-1 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide rounded-tick transition-colors cursor-pointer text-center border ${
                leftTab === 'configure'
                  ? 'bg-signal-500 text-carbon-950 border-signal-500'
                  : 'text-console-400 hover:text-console-100 hover:bg-carbon-800 border-transparent hover:border-console-600'
              }`}
            >
              CONFIGURE
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('library')}
              className={`flex-1 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide rounded-tick transition-colors cursor-pointer text-center border ${
                leftTab === 'library'
                  ? 'bg-signal-500 text-carbon-950 border-signal-500'
                  : 'text-console-400 hover:text-console-100 hover:bg-carbon-800 border-transparent hover:border-console-600'
              }`}
            >
              ADD COMPONENTS
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
        <div className="flex-1 flex flex-col bg-carbon-950 overflow-hidden console-rise console-rise-1">
          {/* View Mode Tabs (Preview / Markdown) */}
          <div className="h-12 border-b border-console-700 bg-carbon-900/60 backdrop-blur px-6 flex items-center justify-between select-none">
            <div className="flex items-center gap-1 bg-carbon-800 p-1 rounded-tick border border-console-600">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer border ${
                  viewMode === 'preview'
                    ? 'bg-signal-500 text-carbon-950 border-signal-500'
                    : 'text-console-400 hover:text-console-100 border-transparent'
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
                className={`flex items-center gap-1.5 px-3 py-1 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer border ${
                  viewMode === 'markdown'
                    ? 'bg-signal-500 text-carbon-950 border-signal-500'
                    : 'text-console-400 hover:text-console-100 border-transparent'
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
              className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-console-400 hover:text-signal-400 px-2.5 py-1 rounded-tick hover:bg-carbon-800 border border-transparent hover:border-console-600 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-signal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
