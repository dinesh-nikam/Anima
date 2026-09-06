import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { heading, wrapWithAlignment, unavailableBlock, cleanText } from './component-helpers';
import { ProviderRegistry } from '../providers/provider.registry';

@Injectable()
export class AchievementsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'achievements',
    name: 'Achievements',
    description: 'List of earned achievements.',
    category: 'achievements',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Achievements', maxLength: 64 },
      { name: 'alignment', type: 'enum', required: false, default: 'left', enumValues: ['left', 'center', 'right'] },
    ],
    requiredData: ['achievements.earned'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Achievements', alignment: 'left' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Achievements');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'left';
    const earned = context.achievements?.earned;
    if (!earned || earned.status !== 'AVAILABLE' || !earned.value || earned.value.length === 0) {
      if (config.fallback === 'RENDER_FALLBACK' || !config.fallback) {
        return [unavailableBlock('Achievements')];
      }
      return [];
    }
    const lines = earned.value.map((a) => `- **${cleanText(a.name)}** — ${cleanText(a.description)} _(${a.rarity.toLowerCase()})_`);
    const block: ReadmeBlock = { type: 'LIST' as any, content: '', metadata: { items: lines, ordered: false } };
    return wrapWithAlignment([heading(title, 2), block], alignment);
  }
}

@Injectable()
export class TrophyWallRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'trophy-wall',
    name: 'Trophy Wall',
    description: 'Trophy showcase via dynamic provider with verified fallback.',
    category: 'achievements',
    version: '1.0.0',
    supportedProviders: ['github-profile-trophy', 'internal-trophies'],
    defaultProvider: 'github-profile-trophy',
    providerCapabilities: ['TROPHY', 'DYNAMIC_IMAGE'],
    settings: [
      {
        name: 'provider',
        type: 'enum',
        required: false,
        default: 'github-profile-trophy',
        enumValues: ['github-profile-trophy', 'internal-trophies'],
        description: 'Selected trophy provider',
      },
      {
        name: 'theme',
        type: 'enum',
        required: false,
        default: 'default',
        enumValues: ['default', 'dark', 'radical', 'tokyonight', 'dracula', 'flat'],
      },
      { name: 'alignment', type: 'enum', required: false, default: 'center', enumValues: ['left', 'center', 'right'] },
      { name: 'title', type: 'string', required: false, default: 'Trophies', maxLength: 64 },
      { name: 'noFrame', type: 'boolean', required: false, default: false },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { provider: 'github-profile-trophy', theme: 'default', alignment: 'center', title: 'Trophies', noFrame: false },
  };

  constructor(private readonly providers: ProviderRegistry) {}

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Trophies');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'center';
    const theme = String(settings['theme'] || 'default');
    const noFrame = Boolean(settings['noFrame']);
    const providerKey = String(settings['provider'] || this.definition.defaultProvider);
    const username = context.profile?.githubLogin;
    if (!username) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Trophy wall')];
      return [];
    }

    const fallbackPolicy =
      config.fallback === 'HIDE_COMPONENT'
        ? 'HIDE'
        : config.fallback === 'RENDER_UNAVAILABLE'
        ? 'SHOW_UNAVAILABLE'
        : 'FALLBACK_TO_INTERNAL';

    const result = this.providers.resolveWithFallback(
      {
        providerKey,
        parameters: { username, theme, noFrame },
      },
      context,
      fallbackPolicy,
      'internal-trophies',
    );

    if (result.status === 'UNAVAILABLE' || result.status === 'DISABLED') {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Trophy wall')];
      return [];
    }

    if (result.contentType === 'IMAGE_URL' && result.url) {
      return wrapWithAlignment(
        [heading(title, 2), { type: 'IMAGE' as any, content: 'Trophies', metadata: { src: result.url, alt: 'GitHub Trophies' } }],
        alignment,
      );
    }

    // Fallback to internal trophy list
    const trophies = context.trophies?.items;
    if (trophies && trophies.status === 'AVAILABLE' && trophies.value && trophies.value.length > 0) {
      const lines = trophies.value.map((t) => `- 🏆 **${cleanText(t.name)}** (${t.level.toLowerCase()})`);
      return wrapWithAlignment(
        [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items: lines, ordered: false } }],
        alignment,
      );
    }

    return [];
  }
}

@Injectable()
export class AchievementSummaryRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'achievement-summary',
    name: 'Achievement Summary',
    description: 'Counts of earned and in-progress achievements.',
    category: 'achievements',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Achievement Summary', maxLength: 64 },
    ],
    requiredData: ['achievements'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Achievement Summary' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Achievement Summary');
    const a = context.achievements;
    if (!a || (a.earned.status !== 'AVAILABLE' && a.inProgress.status !== 'AVAILABLE')) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Achievement summary')];
      return [];
    }
    const earned = a.earned.status === 'AVAILABLE' ? (a.earned.value?.length || 0) : 0;
    const progress = a.inProgress.status === 'AVAILABLE' ? (a.inProgress.value?.length || 0) : 0;
    return [
      heading(title, 2),
      { type: 'PARAGRAPH' as any, content: `**${earned}** earned · **${progress}** in progress` },
    ];
  }
}

@Injectable()
export class AchievementTimelineRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'achievement-timeline',
    name: 'Achievement Timeline',
    description: 'Timeline of earned achievements.',
    category: 'achievements',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Achievement Timeline', maxLength: 64 },
    ],
    requiredData: ['achievements.earned'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Achievement Timeline' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Achievement Timeline');
    const earned = context.achievements?.earned;
    if (!earned || earned.status !== 'AVAILABLE' || !earned.value || earned.value.length === 0) {
      if (config.fallback === 'RENDER_FALLBACK' || !config.fallback) {
        return [unavailableBlock('Achievement timeline')];
      }
      return [];
    }
    const lines = earned.value.map((a) => `- ${cleanText(a.name)} (${a.category.toLowerCase()})`);
    return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items: lines, ordered: false } }];
  }
}

@Injectable()
export class SkillsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'skills',
    name: 'Skills',
    description: 'List of declared skills or derived from language stats.',
    category: 'developer-profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Skills', maxLength: 64 },
      { name: 'source', type: 'enum', required: false, default: 'languages', enumValues: ['languages', 'custom'] },
    ],
    requiredData: ['languages.items'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Skills', source: 'languages' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Skills');
    const source = String(settings['source'] || 'languages');
    if (source === 'custom') {
      const skills = context.customData?.skills;
      if (!skills || skills.status !== 'AVAILABLE' || !skills.value || skills.value.length === 0) {
        if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Skills')];
        return [];
      }
      const items = skills.value.map((s) => `- ${cleanText(s)}`);
      return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items, ordered: false } }];
    }
    const langs = context.languages?.items;
    if (!langs || langs.status !== 'AVAILABLE' || !langs.value || langs.value.length === 0) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Skills')];
      return [];
    }
    const items = langs.value.map((l) => `- **${cleanText(l.name)}** — ${l.percentage.toFixed(1)}%`);
    return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items, ordered: false } }];
  }
}

@Injectable()
export class ProjectsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'projects',
    name: 'Projects',
    description: 'List of declared or starred projects.',
    category: 'developer-profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Projects', maxLength: 64 },
      { name: 'limit', type: 'number', required: false, default: 6 },
    ],
    requiredData: ['customData.projects'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Projects', limit: 6 },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Projects');
    const limit = Math.max(1, Math.min(50, Number(settings['limit']) || 6));
    const projects = context.customData?.projects;
    if (!projects || projects.status !== 'AVAILABLE' || !projects.value || projects.value.length === 0) {
      if (config.fallback === 'RENDER_FALLBACK' || !config.fallback) {
        return [unavailableBlock('Projects')];
      }
      return [];
    }
    const items = projects.value.slice(0, limit).map((p) => {
      const safeName = cleanText(p.name);
      const desc = p.description ? ` — ${cleanText(p.description)}` : '';
      return p.url ? `- **[${safeName}](${p.url})**${desc}` : `- **${safeName}**${desc}`;
    });
    return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items, ordered: false } }];
  }
}

@Injectable()
export class FeaturedProjectsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'featured-projects',
    name: 'Featured Projects',
    description: 'Featured top repositories by stars.',
    category: 'developer-profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Featured Projects', maxLength: 64 },
      { name: 'limit', type: 'number', required: false, default: 4 },
    ],
    requiredData: ['repositories.items'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Featured Projects', limit: 4 },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Featured Projects');
    const limit = Math.max(1, Math.min(20, Number(settings['limit']) || 4));
    const repos = context.repositories?.items;
    if (!repos || repos.status !== 'AVAILABLE' || !repos.value || repos.value.length === 0) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Featured projects')];
      return [];
    }
    const filtered = repos.value
      .filter((r) => !r.isArchived && !r.isFork)
      .sort((a, b) => b.stars - a.stars)
      .slice(0, limit);
    if (filtered.length === 0) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Featured projects')];
      return [];
    }
    const items = filtered.map((r) => {
      const name = cleanText(r.name);
      const desc = r.description ? ` — ${cleanText(r.description)}` : '';
      return `- **[${name}](${r.url})** ⭐ ${r.stars}${desc}`;
    });
    return [heading(title, 2), { type: 'LIST' as any, content: '', metadata: { items, ordered: false } }];
  }
}

@Injectable()
export class QuoteRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'quote',
    name: 'Quote',
    description: 'Inspirational quote line.',
    category: 'presentation',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: '', maxLength: 64 },
    ],
    requiredData: ['customData.quote'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: { title: '' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || ''));
    const quote = cleanText(context.customData?.quote, 280);
    if (!quote) return [];
    const blocks: ReadmeBlock[] = [];
    if (title) blocks.push(heading(title, 2));
    blocks.push({ type: 'PARAGRAPH' as any, content: `> ${quote}` });
    return blocks;
  }
}

@Injectable()
export class CalloutRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'callout',
    name: 'Callout',
    description: 'Generic callout block.',
    category: 'presentation',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: true, maxLength: 64 },
      { name: 'message', type: 'string', required: true, maxLength: 280 },
      { name: 'emoji', type: 'string', required: false, maxLength: 8 },
    ],
    requiredData: [],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: {},
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || ''), 64);
    const message = cleanText(String(settings['message'] || ''), 280);
    const emoji = cleanText(String(settings['emoji'] || ''), 8);
    if (!title || !message) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Callout')];
      return [];
    }
    const prefix = emoji ? `${emoji} ` : '';
    return [{ type: 'PARAGRAPH' as any, content: `> ${prefix}**${title}** — ${message}` }];
  }
}

@Injectable()
export class DividerRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'divider',
    name: 'Divider',
    description: 'Horizontal divider.',
    category: 'presentation',
    version: '1.0.0',
    settings: [],
    requiredData: [],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: {},
  };

  get id() {
    return this.definition.id;
  }

  render(): ReadmeBlock[] {
    return [{ type: 'DIVIDER' as any, content: '' }];
  }
}

@Injectable()
export class FooterRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'footer',
    name: 'Footer',
    description: 'README footer with profile link.',
    category: 'presentation',
    version: '1.0.0',
    settings: [
      { name: 'text', type: 'string', required: false, default: 'Thanks for visiting', maxLength: 128 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: { text: 'Thanks for visiting' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const text = cleanText(String(settings['text'] || 'Thanks for visiting'), 128);
    const username = context.profile?.githubLogin;
    if (!username) return [];
    return [
      { type: 'DIVIDER' as any, content: '' },
      { type: 'PARAGRAPH' as any, content: `${text} · [github.com/${username}](https://github.com/${username})` },
    ];
  }
}

@Injectable()
export class VisitorCounterRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'visitor-counter',
    name: 'Visitor Counter',
    description: 'Visitor counter badge via dynamic provider.',
    category: 'presentation',
    version: '1.0.0',
    settings: [
      {
        name: 'color',
        type: 'enum',
        required: false,
        default: 'blue',
        enumValues: ['blue', 'green', 'orange', 'red', 'grey'],
      },
      { name: 'page', type: 'string', required: false, default: 'profile', maxLength: 128 },
      { name: 'alignment', type: 'enum', required: false, default: 'left', enumValues: ['left', 'center', 'right'] },
    ],
    requiredData: [],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: { color: 'blue', page: 'profile', alignment: 'left' },
  };

  constructor(private readonly providers: ProviderRegistry) {}

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const color = String(settings['color'] || 'blue');
    const page = String(settings['page'] || 'profile');
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'left';
    const result = this.providers.resolve({
      providerKey: 'visitor-counter',
      parameters: { page, color },
    });
    return wrapWithAlignment(
      [{ type: 'IMAGE' as any, content: 'Visitors', metadata: { src: result.url, alt: 'Visitor count' } }],
      alignment,
    );
  }
}

@Injectable()
export class CustomMarkdownRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'custom-markdown',
    name: 'Custom Markdown',
    description: 'Escape hatch: explicit opt-in custom Markdown fragment.',
    category: 'presentation',
    version: '1.0.0',
    settings: [
      { name: 'content', type: 'string', required: true, maxLength: 50_000 },
      { name: 'title', type: 'string', required: false, maxLength: 64 },
    ],
    requiredData: [],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: {},
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const content = String(settings['content'] || '');
    if (!content) return [];
    const blocks: ReadmeBlock[] = [];
    const title = cleanText(String(settings['title'] || ''), 64);
    if (title) blocks.push(heading(title, 2));
    blocks.push({ type: 'CUSTOM_MARKDOWN' as any, content });
    return blocks;
  }
}
