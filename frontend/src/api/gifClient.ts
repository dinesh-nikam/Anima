import type {
  GifAsset,
  GifProject,
  GifProjectVersion,
  CreateGifProjectPayload,
  UpdateGifProjectPayload,
  PaginatedGifProjects,
  GifProjectStatus,
  EffectCategory,
  EffectMetadata,
  CompatibilityValidationResult,
  EstimateBudgetPayload,
  AnimationBudgetEstimate,
  RandomizeProjectPayload,
  StatelessRandomizePayload,
  RandomizeResult,
  GifRenderJob,
  TriggerRenderPayload,
} from '../types/gif';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api/v1';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const json = await res.json();
      detail = (json as any).message ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`GIF API ${method} ${path} failed: ${res.status} ${detail}`);
  }

  return (await res.json()) as T;
}

export const gifApi = {
  /**
   * Uploads an image binary file with multipart/form-data.
   */
  async uploadImage(file: File): Promise<GifAsset> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/gif/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const json = await res.json();
        detail = (json as any).message ?? res.statusText;
      } catch {
        detail = res.statusText;
      }
      throw new Error(`Upload failed: ${res.status} ${detail}`);
    }

    return (await res.json()) as GifAsset;
  },

  /**
   * Retrieves asset download/streaming URL.
   */
  getAssetUrl(assetId: string): string {
    return `${BASE_URL}/gif/assets/${encodeURIComponent(assetId)}`;
  },

  /**
   * Creates a new animation project from an uploaded asset.
   */
  async createProject(payload: CreateGifProjectPayload): Promise<GifProject> {
    return request<GifProject>('POST', '/gif/projects', payload);
  },

  /**
   * Retrieves project details by ID.
   */
  async getProject(projectId: string): Promise<GifProject> {
    return request<GifProject>('GET', `/gif/projects/${encodeURIComponent(projectId)}`);
  },

  /**
   * Updates project configuration or parameters.
   */
  async updateProject(projectId: string, payload: UpdateGifProjectPayload): Promise<GifProject> {
    return request<GifProject>('PUT', `/gif/projects/${encodeURIComponent(projectId)}`, payload);
  },

  /**
   * Triggers algorithmic image analysis on the project's source asset.
   */
  async analyzeProject(projectId: string): Promise<{ project: GifProject; analysis: any }> {
    return request<{ project: GifProject; analysis: any }>('POST', `/gif/projects/${encodeURIComponent(projectId)}/analyze`);
  },

  /**
   * Retrieves saved analysis result for a project.
   */
  async getProjectAnalysis(projectId: string): Promise<any> {
    return request<any>('GET', `/gif/projects/${encodeURIComponent(projectId)}/analysis`);
  },

  /**
   * Transitions project status along the explicit state machine.
   */
  async transitionStatus(projectId: string, status: GifProjectStatus, reason?: string): Promise<GifProject> {
    return request<GifProject>('POST', `/gif/projects/${encodeURIComponent(projectId)}/status`, {
      status,
      reason,
    });
  },

  /**
   * Lists projects with pagination and status filters.
   */
  async listProjects(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedGifProjects> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedGifProjects>('GET', `/gif/projects${queryString}`);
  },

  /**
   * Deletes a project.
   */
  async deleteProject(projectId: string): Promise<{ message: string }> {
    return request<{ message: string }>('DELETE', `/gif/projects/${encodeURIComponent(projectId)}`);
  },

  /**
   * Retrieves historical version snapshots for a project.
   */
  async getProjectVersions(projectId: string): Promise<GifProjectVersion[]> {
    return request<GifProjectVersion[]>('GET', `/gif/projects/${encodeURIComponent(projectId)}/versions`);
  },

  /**
   * Retrieves all available animation effects in the registry.
   */
  async listEffects(category?: EffectCategory): Promise<EffectMetadata[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<EffectMetadata[]>('GET', `/gif/effects${query}`);
  },

  /**
   * Retrieves metadata for a specific animation effect.
   */
  async getEffect(effectId: string): Promise<EffectMetadata> {
    return request<EffectMetadata>('GET', `/gif/effects/${encodeURIComponent(effectId)}`);
  },

  /**
   * Validates compatibility for a proposed combination of active effect IDs.
   */
  async validateEffects(effectIds: string[]): Promise<CompatibilityValidationResult> {
    return request<CompatibilityValidationResult>('POST', '/gif/effects/validate', { effectIds });
  },

  /**
   * Computes budget estimation for total frames, memory, and output size.
   */
  async estimateBudget(payload: EstimateBudgetPayload): Promise<AnimationBudgetEstimate> {
    return request<AnimationBudgetEstimate>('POST', '/gif/estimate', payload);
  },

  /**
   * Generates randomized animation effects for a project using its analysis, profile, and seed.
   */
  async randomizeProject(
    projectId: string,
    payload?: RandomizeProjectPayload,
  ): Promise<{ project: GifProject; randomizeResult: RandomizeResult }> {
    return request<{ project: GifProject; randomizeResult: RandomizeResult }>(
      'POST',
      `/gif/projects/${encodeURIComponent(projectId)}/randomize`,
      payload || {},
    );
  },

  /**
   * Stateless preview randomization endpoint for instant UI exploration.
   */
  async statelessRandomize(payload: StatelessRandomizePayload): Promise<RandomizeResult> {
    return request<RandomizeResult>('POST', '/gif/randomize', payload);
  },

  // ==========================================================================
  // Background Rendering & Export (Phase 6)
  // ==========================================================================

  /**
   * Triggers an asynchronous server-side render job for a project.
   */
  async triggerRender(projectId: string, payload?: TriggerRenderPayload): Promise<{ jobId: string; status: string; totalFrames: number }> {
    return request<{ jobId: string; status: string; totalFrames: number }>(
      'POST',
      `/gif/projects/${encodeURIComponent(projectId)}/render`,
      payload || {},
    );
  },

  /**
   * Retrieves the latest render job for a project.
   */
  async getProjectRenderStatus(projectId: string): Promise<GifRenderJob | null> {
    return request<GifRenderJob | null>('GET', `/gif/projects/${encodeURIComponent(projectId)}/render-status`);
  },

  /**
   * Retrieves a specific render job's status.
   */
  async getRenderJob(jobId: string): Promise<GifRenderJob> {
    return request<GifRenderJob>('GET', `/gif/render-jobs/${encodeURIComponent(jobId)}`);
  },

  /**
   * Requests cancellation for an in-progress render job.
   */
  async cancelRenderJob(jobId: string): Promise<{ message: string }> {
    return request<{ message: string }>('POST', `/gif/render-jobs/${encodeURIComponent(jobId)}/cancel`);
  },

  /**
   * Constructs the URL to download or preview the rendered GIF binary.
   */
  getRenderDownloadUrl(jobId: string): string {
    return `${BASE_URL}/gif/render-jobs/${encodeURIComponent(jobId)}/download`;
  },
};


