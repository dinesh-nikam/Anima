import React, { useState } from 'react';
import type { SaveStatus } from '../../types/readme';
import { SignalHeader, ConsoleBadge, ConsoleButton, ConsoleIconButton } from '../ui/primitives';

interface ReadmeBuilderHeaderProps {
  draftName: string;
  themeName: string;
  templateName: string;
  saveStatus: SaveStatus;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUpdateName: (name: string) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenThemeModal: () => void;
  onOpenTemplateModal: () => void;
  onCopyMarkdown: () => void;
  onOpenPublishModal: () => void;
  onOpenHistoryModal: () => void;
  onBack: () => void;
}

export const ReadmeBuilderHeader: React.FC<ReadmeBuilderHeaderProps> = ({
  draftName,
  themeName,
  templateName,
  saveStatus,
  isDirty,
  canUndo,
  canRedo,
  onUpdateName,
  onSave,
  onUndo,
  onRedo,
  onOpenThemeModal,
  onOpenTemplateModal,
  onCopyMarkdown,
  onOpenPublishModal,
  onOpenHistoryModal,
  onBack,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(draftName);
  const [copied, setCopied] = useState(false);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameInput.trim() && nameInput.trim() !== draftName) {
      onUpdateName(nameInput.trim());
    } else {
      setNameInput(draftName);
    }
  };

  const handleCopy = () => {
    onCopyMarkdown();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLiveLabel = (): string => {
    switch (saveStatus) {
      case 'saving':
        return 'SYNCING…';
      case 'unsaved':
        return 'UNSAVED · MODIFIED';
      case 'conflict':
        return 'CONFLICT · REVISION MISMATCH';
      case 'error':
        return 'SAVE FAILED';
      case 'saved':
      default:
        return 'SAVED';
    }
  };

  const getLiveTone = (): 'default' | 'accent' | 'hazard' => {
    if (saveStatus === 'saved') return 'accent';
    if (saveStatus === 'conflict' || saveStatus === 'error') return 'hazard';
    return 'default';
  };

  return (
    <SignalHeader
      brandMark="AN"
      brandLabel={draftName || 'README BUILDER'}
      live={getLiveLabel()}
      right={
        <>
          {/* Draft name inline edit (compact) */}
          <div className="hidden xl:flex items-center gap-2 mr-1">
            {isEditingName ? (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                autoFocus
                className="bg-carbon-800 text-console-100 font-mono text-xs px-2.5 py-1 rounded-tick border border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500 max-w-[180px]"
                aria-label="Draft name"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameInput(draftName);
                  setIsEditingName(true);
                }}
                className="group flex items-center gap-1.5 max-w-[180px] truncate font-mono text-[11px] text-console-300 hover:text-console-100 transition-colors"
                title="Click to rename"
                aria-label="Rename draft"
              >
                <span className="truncate">{draftName}</span>
                <svg className="w-3 h-3 text-console-500 group-hover:text-console-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <ConsoleBadge tone={getLiveTone()}>{getLiveLabel()}</ConsoleBadge>
          </div>

          {/* Middle: Theme & Template pickers (instrument badges) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTemplateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide bg-carbon-800 hover:bg-carbon-750 text-console-300 border border-console-600 hover:border-signal-600/60 hover:text-signal-400 transition-colors cursor-pointer"
            >
              <span className="text-console-500">TEMPLATE</span>
              <span className="text-console-100">{templateName}</span>
              <svg className="w-3 h-3 text-console-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onOpenThemeModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tick font-mono text-[11px] font-bold uppercase tracking-wide bg-carbon-800 hover:bg-carbon-750 text-console-300 border border-console-600 hover:border-signal-600/60 hover:text-signal-400 transition-colors cursor-pointer"
            >
              <span className="text-console-500">THEME</span>
              <span className="text-signal-400">{themeName}</span>
              <svg className="w-3 h-3 text-console-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center bg-carbon-800 rounded-tick p-1 border border-console-600">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-tick text-console-400 hover:text-signal-400 disabled:opacity-30 disabled:hover:text-console-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Undo"
              aria-label="Undo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-tick text-console-400 hover:text-signal-400 disabled:opacity-30 disabled:hover:text-console-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Redo"
              aria-label="Redo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Copy Markdown */}
          <ConsoleIconButton onClick={handleCopy} title={copied ? 'Copied!' : 'Copy markdown'} aria-label="Copy markdown">
            {copied ? (
              <svg className="w-4 h-4 text-signal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </ConsoleIconButton>

          {/* History */}
          <ConsoleIconButton onClick={onOpenHistoryModal} title="Publication History" aria-label="Publication History">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </ConsoleIconButton>

          {/* Save Draft */}
          <ConsoleButton
            variant={isDirty ? 'primary' : 'secondary'}
            onClick={onSave}
            disabled={saveStatus === 'saving' || !isDirty}
            title="Save draft"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">{saveStatus === 'saving' ? 'Saving…' : 'Save'}</span>
          </ConsoleButton>

          {/* Publish */}
          <ConsoleButton variant="primary" onClick={onOpenPublishModal}>
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="hidden lg:inline">Publish</span>
          </ConsoleButton>

          {/* Back */}
          <ConsoleIconButton onClick={onBack} title="Back to Dashboard" aria-label="Back to Dashboard">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </ConsoleIconButton>
        </>
      }
    />
  );
};
