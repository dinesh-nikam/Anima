import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { heading, wrapWithAlignment, unavailableBlock, image as imgBlock } from './component-helpers';
import { ProviderRegistry } from '../providers/provider.registry';
import { ProviderFallbackPolicy } from '../providers/provider.contract';

@Injectable()
export class GithubStatsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'github-stats',
    name: 'GitHub Stats',
    description: 'Aggregated GitHub statistics card via dynamic provider.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      {
        name: 'theme',
        type: 'enum',
        required: false,
        default: 'default',
        enumValues: ['default', 'dark', 'radical', 'merko', 'gruvbox', 'tokyonight', 'onedark', 'cobalt', 'synthwave', 'highcontrast', 'dracula'],
      },
      { name: 'showIcons', type: 'boolean', required: false, default: true },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
      { name: 'title', type: 'string', required: false, default: 'GitHub Statistics', maxLength: 64 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { theme: 'default', showIcons: true, alignment: 'center', title: 'GitHub Statistics' },
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
    const username = context.profile?.githubLogin;

    if (!username) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('GitHub stats')];
      return [];
    }

    const result = this.providers.resolve({
      providerKey: 'github-stats-readme',
      parameters: { username, theme, show_icons: showIcons },
    });

    const blocks: ReadmeBlock[] = [
      heading(title, 2),
      imgBlock(result.url, 'GitHub Stats'),
    ];
    return wrapWithAlignment(blocks, alignment);
  }
}

@Injectable()
export class StreakStatsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'streak-stats',
    name: 'Streak Stats',
    description: 'Streak statistics card via dynamic provider with verified fallback.',
    category: 'github-statistics',
    version: '1.0.0',
    supportedProviders: ['github-streak-stats', 'internal-contributions'],
    defaultProvider: 'github-streak-stats',
    providerCapabilities: ['STATISTICS', 'DYNAMIC_IMAGE'],
    settings: [
      {
        name: 'provider',
        type: 'enum',
        required: false,
        default: 'github-streak-stats',
        enumValues: ['github-streak-stats', 'internal-contributions'],
        description: 'Selected streak provider',
      },
      {
        name: 'theme',
        type: 'enum',
        required: false,
        default: 'default',
        enumValues: ['default', 'dark', 'highcontrast', 'tokyonight', 'radical'],
      },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
      { name: 'title', type: 'string', required: false, default: 'Streak Stats', maxLength: 64 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { provider: 'github-streak-stats', theme: 'default', alignment: 'center', title: 'Streak Stats' },
  };

  constructor(private readonly providers: ProviderRegistry) {}

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Streak Stats');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const theme = String(settings['theme'] || 'default');
    const providerKey = String(settings['provider'] || this.definition.defaultProvider);
    const username = context.profile?.githubLogin;

    if (!username) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Streak stats')];
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
        parameters: { username, theme },
      },
      context,
      fallbackPolicy,
      'internal-contributions',
    );

    if (result.status === 'UNAVAILABLE' || result.status === 'DISABLED') {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Streak stats')];
      return [];
    }

    if (result.contentType === 'IMAGE_URL' && result.url) {
      return wrapWithAlignment(
        [heading(title, 2), imgBlock(result.url, 'GitHub Streak')],
        alignment,
      );
    }

    // Fallback or internal data rendering
    const c = context.statistics?.contributions;
    const total = c?.status === 'AVAILABLE' && c.value !== undefined ? c.value.toLocaleString() : 'N/A';
    return wrapWithAlignment(
      [heading(title, 2), { type: 'PARAGRAPH' as any, content: `Current Activity & Contributions: **${total}** total events` }],
      alignment,
    );
  }
}

@Injectable()
export class TopLanguagesRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'top-languages',
    name: 'Top Languages',
    description: 'Top languages card via dynamic provider with verified fallback.',
    category: 'github-statistics',
    version: '1.0.0',
    supportedProviders: ['github-top-langs', 'internal-languages'],
    defaultProvider: 'github-top-langs',
    providerCapabilities: ['STATISTICS', 'DYNAMIC_IMAGE'],
    settings: [
      {
        name: 'provider',
        type: 'enum',
        required: false,
        default: 'github-top-langs',
        enumValues: ['github-top-langs', 'internal-languages'],
        description: 'Selected top languages provider',
      },
      {
        name: 'layout',
        type: 'enum',
        required: false,
        default: 'compact',
        enumValues: ['compact', 'normal', 'donut', 'donut-vertical', 'pie'],
      },
      {
        name: 'theme',
        type: 'enum',
        required: false,
        default: 'default',
        enumValues: ['default', 'dark', 'radical', 'tokyonight', 'dracula'],
      },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
      { name: 'title', type: 'string', required: false, default: 'Top Languages', maxLength: 64 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { provider: 'github-top-langs', layout: 'compact', theme: 'default', alignment: 'center', title: 'Top Languages' },
  };

  constructor(private readonly providers: ProviderRegistry) {}

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Top Languages');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const layout = String(settings['layout'] || 'compact');
    const theme = String(settings['theme'] || 'default');
    const providerKey = String(settings['provider'] || this.definition.defaultProvider);
    const username = context.profile?.githubLogin;

    if (!username) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Top languages')];
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
        parameters: { username, layout, theme },
      },
      context,
      fallbackPolicy,
      'internal-languages',
    );

    if (result.status === 'UNAVAILABLE' || result.status === 'DISABLED') {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Top languages')];
      return [];
    }

    if (result.contentType === 'IMAGE_URL' && result.url) {
      return wrapWithAlignment(
        [heading(title, 2), imgBlock(result.url, 'Top Languages')],
        alignment,
      );
    }

    // Fallback to internal language list
    const langs = context.languages?.items;
    if (langs && langs.status === 'AVAILABLE' && langs.value && langs.value.length > 0) {
      const lines = langs.value.slice(0, 5).map((l) => `- **${l.name}**: ${l.percentage.toFixed(1)}%`);
      return wrapWithAlignment(
        [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items: lines, ordered: false } }],
        alignment,
      );
    }

    return [];
  }
}

@Injectable()
export class ContributionStatsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'contribution-stats',
    name: 'Contribution Stats',
    description: 'Total contributions summary from authoritative analytics.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Contributions', maxLength: 64 },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
    ],
    requiredData: ['statistics.contributions'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Contributions', alignment: 'center' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Contributions');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const c = context.statistics?.contributions;
    if (!c || c.status !== 'AVAILABLE' || c.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Contribution stats')];
      return [];
    }
    const period = context.statistics.contributions.sourceUpdatedAt?.slice(0, 4) || '';
    const text = `**${c.value.toLocaleString()}** total contributions${period ? ` in ${period}` : ''}`;
    return wrapWithAlignment([heading(title, 2), { type: 'PARAGRAPH' as any, content: text }], alignment);
  }
}

@Injectable()
export class ContributionGraphRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'contribution-graph',
    name: 'Contribution Graph',
    description: 'Textual contribution graph derived from authoritative data.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Activity Graph', maxLength: 64 },
      { name: 'days', type: 'number', required: false, default: 90 },
    ],
    requiredData: ['statistics.contributions'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Activity Graph', days: 90 },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Activity Graph');
    const days = Math.max(7, Math.min(365, Number(settings['days']) || 90));
    const c = context.statistics?.contributions;
    if (!c || c.status !== 'AVAILABLE') {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Contribution graph')];
      return [];
    }
    // Render a deterministic textual summary; do not fabricate bar shapes
    const lines: string[] = [];
    lines.push(`Total contributions tracked: **${c.value.toLocaleString()}**`);
    lines.push(`Window: last ${days} days (synthesised from authoritative snapshot)`);
    return [
      heading(title, 2),
      { type: 'PARAGRAPH' as any, content: lines.join('  \n') },
    ];
  }
}

@Injectable()
export class RepositoryStatsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'repository-stats',
    name: 'Repository Stats',
    description: 'Aggregated counts of repositories, stars, and forks.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Repository Stats', maxLength: 64 },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
    ],
    requiredData: ['statistics'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Repository Stats', alignment: 'center' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Repository Stats');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const s = context.statistics;
    if (!s) return [];
    const cells: string[] = [];
    if (s.repositories.status === 'AVAILABLE' && s.repositories.value !== undefined) {
      cells.push(`**${s.repositories.value}** repositories`);
    }
    if (s.stars.status === 'AVAILABLE' && s.stars.value !== undefined) {
      cells.push(`**${s.stars.value}** total stars`);
    }
    if (s.forks.status === 'AVAILABLE' && s.forks.value !== undefined) {
      cells.push(`**${s.forks.value}** total forks`);
    }
    if (cells.length === 0) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Repository stats')];
      return [];
    }
    return wrapWithAlignment(
      [heading(title, 2), { type: 'PARAGRAPH' as any, content: cells.join('  \n') }],
      alignment,
    );
  }
}

@Injectable()
export class ActivityRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'activity',
    name: 'Activity',
    description: 'Recent activity timeline.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Recent Activity', maxLength: 64 },
      { name: 'limit', type: 'number', required: false, default: 5 },
    ],
    requiredData: ['activity'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Recent Activity', limit: 5 },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Recent Activity');
    const limit = Math.max(1, Math.min(20, Number(settings['limit']) || 5));
    const items = context.activity?.items;
    if (!items || items.status !== 'AVAILABLE' || !items.value || items.value.length === 0) {
      if (config.fallback === 'RENDER_FALLBACK' || !config.fallback) {
        return [unavailableBlock('Recent activity')];
      }
      return [];
    }
    const limited = items.value.slice(0, limit);
    const lines = limited.map((it) => {
      const date = it.occurredAt?.slice(0, 10) || '';
      const summary = it.summary || it.type;
      const repo = it.repositoryName ? ` (${it.repositoryName})` : '';
      return `- ${date}: ${summary}${repo}`;
    });
    return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items: lines, ordered: false } }];
  }
}

@Injectable()
export class PullRequestsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'pull-requests',
    name: 'Pull Requests',
    description: 'Aggregated pull-request count.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Pull Requests', maxLength: 64 },
    ],
    requiredData: ['statistics.pullRequests'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Pull Requests' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Pull Requests');
    const v = context.statistics?.pullRequests;
    if (!v || v.status !== 'AVAILABLE' || v.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Pull request count')];
      return [];
    }
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: `**${v.value.toLocaleString()}** pull requests` }];
  }
}

@Injectable()
export class IssuesRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'issues',
    name: 'Issues',
    description: 'Aggregated issue count.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Issues', maxLength: 64 },
    ],
    requiredData: ['statistics.issues'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Issues' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Issues');
    const v = context.statistics?.issues;
    if (!v || v.status !== 'AVAILABLE' || v.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Issue count')];
      return [];
    }
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: `**${v.value.toLocaleString()}** issues opened` }];
  }
}

@Injectable()
export class ReviewsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'reviews',
    name: 'Reviews',
    description: 'Aggregated review count.',
    category: 'github-statistics',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Reviews', maxLength: 64 },
    ],
    requiredData: ['statistics.reviews'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Reviews' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Reviews');
    const v = context.statistics?.reviews;
    if (!v || v.status !== 'AVAILABLE' || v.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Review count')];
      return [];
    }
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: `**${v.value.toLocaleString()}** reviews submitted` }];
  }
}
