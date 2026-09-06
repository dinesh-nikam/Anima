import type {
  TemplateSummary,
  TemplateDefinition,
  ThemeSummary,
  ComponentSummary,
  ProviderSummary,
  RenderRequest,
  RenderResult,
  ValidateResult,
} from '../types/readme';

const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? '/api/v1';

// Phase 6 client — talks only to the backend README rendering API.
// No provider URLs or rendering logic lives here; the backend is the
// canonical renderer.

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
    throw new Error(`README API ${method} ${path} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

export async function listTemplates(): Promise<{ templates: TemplateSummary[] }> {
  return request('GET', '/readme/templates');
}

export async function getTemplate(key: string): Promise<TemplateDefinition> {
  return request('GET', `/readme/templates/${encodeURIComponent(key)}`);
}

export async function listThemes(): Promise<{ themes: ThemeSummary[] }> {
  return request('GET', '/readme/themes');
}

export async function listComponents(): Promise<{ components: ComponentSummary[] }> {
  return request('GET', '/readme/components');
}

export async function listProviders(): Promise<{ providers: ProviderSummary[] }> {
  return request('GET', '/readme/providers');
}

export async function renderReadme(req: RenderRequest): Promise<RenderResult> {
  return request('POST', '/readme/render', req);
}

export async function validateConfig(
  req: RenderRequest,
): Promise<ValidateResult> {
  return request('POST', '/readme/validate', {
    templateKey: req.templateKey,
    themeKey: req.themeKey,
    sections: (req.sections ?? []).map((s: any) => ({
      sectionKey: s.sectionKey,
      componentKey: s.sectionKey,
      enabled: s.enabled,
      settings: s.settings,
    })),
  });
}
