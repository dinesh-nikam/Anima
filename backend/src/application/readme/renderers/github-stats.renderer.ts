import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { heading, wrapWithAlignment, image as imgBlock, unavailableBlock } from './component-helpers';
import { ProviderRegistry, ProviderFallbackPolicy } from '../providers/provider.registry';

@Injectable()
export class GithubStatsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'github-stats',
    name: 'GitHub Stats',
    description: 'Aggregated GitHub statistics card via dynamic provider with verified fallback.',
    category: 'github-statistics',
    version: '1.0.0',
    supportedProviders: ['github-stats-readme', 'internal-github-stats'],
    defaultProvider: 'github-stats-readme',
    providerCapabilities: ['STATISTICS', 'DYNAMIC_IMAGE'],
    settings: [
      {
        name: 'provider',
        type: 'enum',
        required: false,
        default: 'github-stats-readme',
        enumValues: ['github-stats-readme', 'internal-github-stats'],
        description: 'Selected statistics data/card provider',
      },
      {
        name: 'theme',
        type: 'enum',
        required: false,
        default: 'default',
        enumValues: [
          'default',
          'dark',
          'radical',
          'merko',
          'gruvbox',
          'tokyonight',
          'onedark',
          'cobalt',
          'synthwave',
          'highcontrast',
          'dracula',
        ],
        description: 'Card visual theme',
      },
      { name: 'showIcons', type: 'boolean', required: false, default: true, description: 'Display metric icons' },
      {
        name: 'alignment',
        type: 'enum',
        required: false,
        default: 'center',
        enumValues: ['left', 'center', 'right'],
        description: 'Alignment',
      },
      { name: 'title', type: 'string', required: false, default: 'GitHub Statistics', maxLength: 64 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: {
      provider: 'github-stats-readme',
      theme: 'default',
      showIcons: true,
      alignment: 'center',
      title: 'GitHub Statistics',
    },
  };

  constructor(private readonly providers: ProviderRegistry) {}

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'GitHub Statistics');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const theme = String(settings['theme'] || 'default');
    const showIcons = settings['showIcons'] !== false;
    const providerKey = String(settings['provider'] || this.definition.defaultProvider);
    const username = context.profile?.githubLogin;

    if (!username) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('GitHub stats')];
      return [];
    }

    const fallbackPolicy: ProviderFallbackPolicy =
      config.fallback === 'HIDE_COMPONENT'
        ? 'HIDE'
        : config.fallback === 'RENDER_UNAVAILABLE'
        ? 'SHOW_UNAVAILABLE'
        : 'FALLBACK_TO_INTERNAL';

    const result = this.providers.resolveWithFallback(
      {
        providerKey,
        parameters: { username, theme, showIcons },
      },
      context,
      fallbackPolicy,
      'internal-github-stats',
    );

    if (result.status === 'UNAVAILABLE' || result.status === 'DISABLED') {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('GitHub stats')];
      return [];
    }

    if (result.contentType === 'IMAGE_URL' && result.url) {
      return wrapWithAlignment([heading(title, 2), imgBlock(result.url, 'GitHub Stats')], alignment);
    }

    // Render internal authoritative metrics
    if (result.data && typeof result.data === 'object') {
      const data = result.data as { metrics?: Record<string, number> };
      const m = data.metrics || {};
      const lines: string[] = [];
      if (m.contributions !== undefined) lines.push(`- Total Contributions: **${m.contributions.toLocaleString()}**`);
      if (m.repositories !== undefined) lines.push(`- Public Repositories: **${m.repositories}**`);
      if (m.stars !== undefined) lines.push(`- Total Stars Earned: **${m.stars}**`);
      if (m.forks !== undefined) lines.push(`- Total Forks: **${m.forks}**`);
      if (m.pullRequests !== undefined) lines.push(`- Pull Requests: **${m.pullRequests}**`);
      if (m.issues !== undefined) lines.push(`- Issues Opened: **${m.issues}**`);

      return wrapWithAlignment(
        [
          heading(title, 2),
          {
            type: 'LIST' as any,
            content: '',
            metadata: { items: lines, ordered: false },
          },
        ],
        alignment,
      );
    }

    return [];
  }
}
