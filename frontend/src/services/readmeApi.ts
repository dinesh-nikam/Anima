import type {
  ReadmeDraft,
  ReadmeSectionInstance,
  ComponentDefinition,
  ThemeDefinition,
  TemplateDefinition,
  PreviewResult,
  DraftValidationError,
  TargetRepositoryItem,
  BranchItem,
  PublishPreviewResponse,
  PublicationReceipt,
  ReadmeVersionItem,
} from '../types/readme';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export const getGithubConnectUrl = (): string => `${BASE_URL}/auth/github/connect`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const error: any = new Error(errorData.message || 'API request failed');
    error.status = response.status;
    error.code = errorData.errorCode || errorData.code;
    error.details = errorData.details;
    error.serverRevision = errorData.serverRevision;
    throw error;
  }

  return response.json();
}

export const readmeApi = {
  // Session / Auth
  async getSession(): Promise<{
    authenticated: boolean;
    user?: {
      id: string;
      displayName?: string;
      role?: string;
      github?: { connected: boolean; login?: string; avatarUrl?: string };
    };
  }> {
    return request('/auth/session');
  },

  // Catalog
  async getComponents(): Promise<ComponentDefinition[]> {
    return request('/readme/components');
  },

  async getComponentById(id: string): Promise<ComponentDefinition> {
    return request(`/readme/components/${encodeURIComponent(id)}`);
  },

  async getTemplates(): Promise<TemplateDefinition[]> {
    return request('/readme/templates');
  },

  async getTemplateByKey(key: string): Promise<TemplateDefinition> {
    return request(`/readme/templates/${encodeURIComponent(key)}`);
  },

  async getThemes(): Promise<ThemeDefinition[]> {
    return request('/readme/themes');
  },

  async getThemeByKey(key: string): Promise<ThemeDefinition> {
    return request(`/readme/themes/${encodeURIComponent(key)}`);
  },

  // Dynamic Providers
  async getProviders(options?: { category?: string; component?: string; includeDisabled?: boolean }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.component) params.set('component', options.component);
    if (options?.includeDisabled) params.set('includeDisabled', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/readme/providers${qs}`);
  },

  async getProviderByKey(key: string): Promise<any> {
    return request(`/readme/providers/${encodeURIComponent(key)}`);
  },

  async getProviderHealth(key: string): Promise<any> {
    return request(`/readme/providers/${encodeURIComponent(key)}/health`);
  },

  async adminUpdateProvider(key: string, action: 'ENABLE' | 'DISABLE' | 'DEPRECATE'): Promise<any> {
    return request(`/readme/admin/providers/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  },

  async adminCheckProviderHealth(key: string): Promise<any> {
    return request(`/readme/admin/providers/${encodeURIComponent(key)}/health-check`, {
      method: 'POST',
    });
  },

  // Drafts CRUD
  async listDrafts(): Promise<ReadmeDraft[]> {
    return request('/readme/drafts');
  },

  async getDraft(draftId: string): Promise<ReadmeDraft> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}`);
  },

  async createDraft(payload: {
    name: string;
    description?: string;
    templateId?: string;
    themeId?: string;
    sections?: Array<{ componentKey: string; configuration?: Record<string, unknown>; enabled?: boolean }>;
  }): Promise<ReadmeDraft> {
    return request('/readme/drafts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDraft(
    draftId: string,
    payload: {
      name?: string;
      description?: string;
      themeId?: string;
      templateId?: string;
      configuration?: Record<string, unknown>;
      expectedRevision: number;
    },
  ): Promise<ReadmeDraft> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteDraft(draftId: string): Promise<{ message: string; draftId: string }> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
    });
  },

  async duplicateDraft(draftId: string): Promise<ReadmeDraft> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/duplicate`, {
      method: 'POST',
    });
  },

  // Sections
  async addSection(
    draftId: string,
    payload: {
      componentKey: string;
      configuration?: Record<string, unknown>;
      enabled?: boolean;
      displayOrder?: number;
    },
  ): Promise<ReadmeSectionInstance> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/sections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSection(
    draftId: string,
    sectionId: string,
    payload: {
      configuration?: Record<string, unknown>;
      enabled?: boolean;
      displayOrder?: number;
    },
  ): Promise<ReadmeSectionInstance> {
    return request(
      `/readme/drafts/${encodeURIComponent(draftId)}/sections/${encodeURIComponent(sectionId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteSection(draftId: string, sectionId: string): Promise<{ message: string; sectionId: string }> {
    return request(
      `/readme/drafts/${encodeURIComponent(draftId)}/sections/${encodeURIComponent(sectionId)}`,
      {
        method: 'DELETE',
      },
    );
  },

  async reorderSections(draftId: string, sectionIds: string[]): Promise<ReadmeSectionInstance[]> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/sections/order`, {
      method: 'PUT',
      body: JSON.stringify({ sectionIds }),
    });
  },

  // Operations
  async applyTemplate(
    draftId: string,
    templateKey: string,
    mode: 'REPLACE' | 'MERGE' = 'REPLACE',
  ): Promise<ReadmeDraft> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateKey, mode }),
    });
  },

  async previewDraft(
    draftId: string,
    payload?: {
      themeId?: string;
      templateId?: string;
      sections?: Array<{
        id?: string;
        componentKey: string;
        configuration: Record<string, unknown>;
        enabled: boolean;
        displayOrder?: number;
      }>;
    },
  ): Promise<PreviewResult> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/preview`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async validateDraft(draftId: string): Promise<{ valid: boolean; errors: DraftValidationError[] }> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/validate`, {
      method: 'POST',
    });
  },

  async getMarkdown(draftId: string): Promise<{ markdown: string; metadata: any }> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/markdown`);
  },

  // ==========================================================================
  // Phase 8 Publishing & Version APIs
  // ==========================================================================

  async getTargetRepositories(): Promise<TargetRepositoryItem[]> {
    return request('/readme/targets');
  },

  async getTargetBranches(owner: string, repo: string): Promise<BranchItem[]> {
    return request(`/readme/targets/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`);
  },

  async createPublishPreview(
    draftId: string,
    payload: {
      repositoryId?: string;
      owner?: string;
      repo?: string;
      branch?: string;
      path?: string;
      commitMessage?: string;
    },
  ): Promise<PublishPreviewResponse> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/publish/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async confirmPublish(
    draftId: string,
    payload: {
      intentId: string;
      commitMessage?: string;
    },
  ): Promise<PublicationReceipt> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/publish`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getDraftPublications(draftId: string): Promise<{ publications: PublicationReceipt[] }> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/publications`);
  },

  async getPublication(publicationId: string): Promise<PublicationReceipt> {
    return request(`/readme/publications/${encodeURIComponent(publicationId)}`);
  },

  async getDraftVersions(draftId: string): Promise<ReadmeVersionItem[]> {
    return request(`/readme/drafts/${encodeURIComponent(draftId)}/versions`);
  },
};
