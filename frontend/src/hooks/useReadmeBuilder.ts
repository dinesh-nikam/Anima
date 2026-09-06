import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ReadmeDraft,
  ReadmeSectionInstance,
  ComponentDefinition,
  ThemeDefinition,
  TemplateDefinition,
  PreviewResult,
  SaveStatus,
} from '../types/readme';
import { readmeApi } from '../services/readmeApi';

interface HistorySnapshot {
  sections: ReadmeSectionInstance[];
  themeId: string;
  templateId: string | null;
  name: string;
}

export function useReadmeBuilder(draftId: string) {
  const [draft, setDraft] = useState<ReadmeDraft | null>(null);
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictServerRevision, setConflictServerRevision] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // History for Undo / Redo
  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const debounceTimerRef = useRef<any>(null);
  const initialLoadRef = useRef(false);

  // Load Initial Draft & Catalogs
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [loadedDraft, loadedComps, loadedThemes, loadedTemplates] = await Promise.all([
        readmeApi.getDraft(draftId),
        readmeApi.getComponents(),
        readmeApi.getThemes(),
        readmeApi.getTemplates(),
      ]);

      setDraft(loadedDraft);
      setComponents(loadedComps);
      setThemes(loadedThemes);
      setTemplates(loadedTemplates);

      if (loadedDraft.sections.length > 0) {
        setSelectedSectionId(loadedDraft.sections[0].id);
      }

      // Initial preview
      const previewRes = await readmeApi.previewDraft(draftId);
      setPreview(previewRes);
      setSaveStatus('saved');
      setIsDirty(false);
      pastRef.current = [];
      futureRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load README builder');
    } finally {
      setIsLoading(false);
      initialLoadRef.current = true;
    }
  }, [draftId]);

  useEffect(() => {
    loadData();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadData]);

  const updateHistory = () => {
    if (!draft) return;
    const current: HistorySnapshot = {
      sections: JSON.parse(JSON.stringify(draft.sections)),
      themeId: draft.themeId,
      templateId: draft.templateId,
      name: draft.name,
    };
    pastRef.current.push(current);
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  // Debounced Live Preview
  const triggerPreview = useCallback((workingDraft: ReadmeDraft) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsPreviewLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          themeId: workingDraft.themeId,
          templateId: workingDraft.templateId || undefined,
          sections: workingDraft.sections.map((s) => ({
            id: s.id,
            componentKey: s.componentKey,
            configuration: s.configuration,
            enabled: s.enabled,
            displayOrder: s.displayOrder,
          })),
        };
        const result = await readmeApi.previewDraft(draftId, payload);
        setPreview(result);
      } catch {
        // preserve existing preview on network error
      } finally {
        setIsPreviewLoading(false);
      }
    }, 350);
  }, [draftId]);

  // Section Operations
  const addSection = (componentKey: string) => {
    if (!draft) return;
    const compDef = components.find((c) => c.id === componentKey);
    const defaultSettings = compDef ? { ...compDef.defaultSettings } : {};
    const maxOrder = draft.sections.length > 0
      ? Math.max(...draft.sections.map((s) => s.displayOrder))
      : 0;

    const newSection: ReadmeSectionInstance = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      draftId,
      componentKey,
      displayOrder: maxOrder + 10,
      enabled: true,
      configuration: defaultSettings,
      schemaVersion: '1.0.0',
      componentVersion: compDef?.version || '1.0.0',
    };

    updateHistory();

    const updatedDraft = {
      ...draft,
      sections: [...draft.sections, newSection],
    };

    setDraft(updatedDraft);
    setSelectedSectionId(newSection.id);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const removeSection = (sectionId: string) => {
    if (!draft) return;
    const filtered = draft.sections.filter((s) => s.id !== sectionId);

    updateHistory();

    const updatedDraft = { ...draft, sections: filtered };
    setDraft(updatedDraft);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(filtered.length > 0 ? filtered[0].id : null);
    }
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const toggleSectionEnabled = (sectionId: string) => {
    if (!draft) return;
    const updatedSections = draft.sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s,
    );

    updateHistory();

    const updatedDraft = { ...draft, sections: updatedSections };
    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!draft) return;
    const index = draft.sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === draft.sections.length - 1) return;

    const newSections = [...draft.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    // Re-assign displayOrders
    newSections.forEach((s, idx) => {
      s.displayOrder = (idx + 1) * 10;
    });

    updateHistory();

    const updatedDraft = { ...draft, sections: newSections };
    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const duplicateSection = (sectionId: string) => {
    if (!draft) return;
    const sectionToDup = draft.sections.find((s) => s.id === sectionId);
    if (!sectionToDup) return;

    const index = draft.sections.findIndex((s) => s.id === sectionId);
    const newSection: ReadmeSectionInstance = {
      ...JSON.parse(JSON.stringify(sectionToDup)),
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      displayOrder: sectionToDup.displayOrder + 5,
    };

    const newSections = [...draft.sections];
    newSections.splice(index + 1, 0, newSection);
    newSections.forEach((s, idx) => {
      s.displayOrder = (idx + 1) * 10;
    });

    updateHistory();

    const updatedDraft = { ...draft, sections: newSections };
    setDraft(updatedDraft);
    setSelectedSectionId(newSection.id);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const updateSectionConfig = (sectionId: string, newConfig: Record<string, unknown>) => {
    if (!draft) return;
    const updatedSections = draft.sections.map((s) =>
      s.id === sectionId ? { ...s, configuration: { ...s.configuration, ...newConfig } } : s,
    );

    const updatedDraft = { ...draft, sections: updatedSections };
    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const changeTheme = (themeKey: string) => {
    if (!draft || draft.themeId === themeKey) return;
    updateHistory();

    const updatedDraft = { ...draft, themeId: themeKey };
    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  const updateDraftName = (name: string) => {
    if (!draft) return;
    const updatedDraft = { ...draft, name };
    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
  };

  const applyTemplate = (templateKey: string, mode: 'REPLACE' | 'MERGE' = 'REPLACE') => {
    if (!draft) return;
    const tpl = templates.find((t) => t.templateKey === templateKey);
    if (!tpl) return;

    let newSections: ReadmeSectionInstance[] = [];

    if (mode === 'REPLACE') {
      newSections = tpl.sections.map((sec, idx) => {
        const compDef = components.find((c) => c.id === sec.componentKey);
        return {
          id: 'local-' + Date.now() + '-' + idx,
          draftId,
          componentKey: sec.componentKey,
          displayOrder: (idx + 1) * 10,
          enabled: sec.enabled !== false,
          configuration: { ...(compDef?.defaultSettings || {}), ...(sec.configuration || {}) },
          schemaVersion: '1.0.0',
          componentVersion: compDef?.version || '1.0.0',
        };
      });
    } else {
      const existingKeys = new Set(draft.sections.map((s) => s.componentKey));
      let nextOrder = draft.sections.length > 0
        ? Math.max(...draft.sections.map((s) => s.displayOrder)) + 10
        : 10;
      newSections = [...draft.sections];

      tpl.sections.forEach((sec, idx) => {
        if (!existingKeys.has(sec.componentKey)) {
          const compDef = components.find((c) => c.id === sec.componentKey);
          newSections.push({
            id: 'local-' + Date.now() + '-' + idx,
            draftId,
            componentKey: sec.componentKey,
            displayOrder: nextOrder,
            enabled: sec.enabled !== false,
            configuration: { ...(compDef?.defaultSettings || {}), ...(sec.configuration || {}) },
            schemaVersion: '1.0.0',
            componentVersion: compDef?.version || '1.0.0',
          });
          nextOrder += 10;
        }
      });
    }

    updateHistory();

    const updatedDraft = {
      ...draft,
      templateId: templateKey,
      themeId: tpl.themeKey || draft.themeId,
      sections: newSections,
    };

    setDraft(updatedDraft);
    if (newSections.length > 0) {
      setSelectedSectionId(newSections[0].id);
    }
    setIsDirty(true);
    setSaveStatus('unsaved');
    triggerPreview(updatedDraft);
  };

  // Undo & Redo
  const undo = () => {
    if (!draft || pastRef.current.length === 0) return;
    const previous = pastRef.current.pop()!;
    const current: HistorySnapshot = {
      sections: JSON.parse(JSON.stringify(draft.sections)),
      themeId: draft.themeId,
      templateId: draft.templateId,
      name: draft.name,
    };
    futureRef.current.push(current);

    const updatedDraft = {
      ...draft,
      sections: previous.sections,
      themeId: previous.themeId,
      templateId: previous.templateId,
      name: previous.name,
    };

    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    triggerPreview(updatedDraft);
  };

  const redo = () => {
    if (!draft || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    const current: HistorySnapshot = {
      sections: JSON.parse(JSON.stringify(draft.sections)),
      themeId: draft.themeId,
      templateId: draft.templateId,
      name: draft.name,
    };
    pastRef.current.push(current);

    const updatedDraft = {
      ...draft,
      sections: next.sections,
      themeId: next.themeId,
      templateId: next.templateId,
      name: next.name,
    };

    setDraft(updatedDraft);
    setIsDirty(true);
    setSaveStatus('unsaved');
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    triggerPreview(updatedDraft);
  };

  // Explicit Save
  const save = async () => {
    if (!draft) return;
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      // 1. Update draft metadata and revision
      await readmeApi.updateDraft(draftId, {
        name: draft.name,
        description: draft.description || undefined,
        themeId: draft.themeId,
        templateId: draft.templateId || undefined,
        expectedRevision: draft.revision,
      });

      // 2. Re-apply sections if structure changed
      await readmeApi.applyTemplate(draftId, draft.templateId || 'professional-developer', 'REPLACE');
      
      // Update actual custom configurations
      for (const section of draft.sections) {
        if (!section.id.startsWith('local-')) {
          await readmeApi.updateSection(draftId, section.id, {
            configuration: section.configuration,
            enabled: section.enabled,
            displayOrder: section.displayOrder,
          });
        }
      }

      // Reload fresh server copy
      const refreshed = await readmeApi.getDraft(draftId);
      setDraft(refreshed);
      setSaveStatus('saved');
      setIsDirty(false);
      setConflictServerRevision(null);

      // Re-trigger preview with fresh metadata
      const previewRes = await readmeApi.previewDraft(draftId);
      setPreview(previewRes);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'README_DRAFT_CONFLICT') {
        setSaveStatus('conflict');
        setConflictServerRevision(err.serverRevision || (draft.revision + 1));
      } else {
        setSaveStatus('error');
        setErrorMessage(err.message || 'Save failed');
      }
    }
  };

  const reloadServerDraft = async () => {
    await loadData();
    setConflictServerRevision(null);
  };

  const copyMarkdown = async () => {
    if (!preview?.markdown) return false;
    try {
      await navigator.clipboard.writeText(preview.markdown);
      return true;
    } catch {
      return false;
    }
  };

  const validate = async () => {
    try {
      const res = await readmeApi.validateDraft(draftId);
      return res;
    } catch (err: any) {
      return { valid: false, errors: [{ reason: err.message || 'Validation failed' }] };
    }
  };

  const selectedSection = draft?.sections.find((s) => s.id === selectedSectionId) || null;
  const selectedComponentDef = selectedSection
    ? components.find((c) => c.id === selectedSection.componentKey) || null
    : null;

  return {
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
  };
}
