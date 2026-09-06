import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { heading, wrapWithAlignment, unavailableBlock } from './component-helpers';

@Injectable()
export class FollowersRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'followers',
    name: 'Followers',
    description: 'Aggregated follower count.',
    category: 'community',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Followers', maxLength: 64 },
    ],
    requiredData: ['statistics.followers'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Followers' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Followers');
    const v = context.statistics?.followers;
    if (!v || v.status !== 'AVAILABLE' || v.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Follower count')];
      return [];
    }
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: `**${v.value.toLocaleString()}** followers` }];
  }
}

@Injectable()
export class FollowingRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'following',
    name: 'Following',
    description: 'Aggregated following count.',
    category: 'community',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Following', maxLength: 64 },
    ],
    requiredData: ['statistics.following'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Following' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Following');
    const v = context.statistics?.following;
    if (!v || v.status !== 'AVAILABLE' || v.value === undefined) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Following count')];
      return [];
    }
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: `**${v.value.toLocaleString()}** following` }];
  }
}

@Injectable()
export class OpenSourceRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'open-source',
    name: 'Open Source',
    description: 'Open-source focus summary.',
    category: 'community',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Open Source', maxLength: 64 },
    ],
    requiredData: ['statistics'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_UNAVAILABLE'],
    defaultSettings: { title: 'Open Source' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Open Source');
    const repos = context.statistics?.repositories;
    const stars = context.statistics?.stars;
    const forks = context.statistics?.forks;
    if (
      (repos?.status !== 'AVAILABLE') &&
      (stars?.status !== 'AVAILABLE') &&
      (forks?.status !== 'AVAILABLE')
    ) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('Open-source summary')];
      return [];
    }
    const lines: string[] = [];
    if (repos?.status === 'AVAILABLE' && repos.value !== undefined) lines.push(`**${repos.value}** repositories`);
    if (stars?.status === 'AVAILABLE' && stars.value !== undefined) lines.push(`**${stars.value}** total stars`);
    if (forks?.status === 'AVAILABLE' && forks.value !== undefined) lines.push(`**${forks.value}** total forks`);
    return [heading(title, 2), { type: 'PARAGRAPH' as any, content: lines.join('  \n') }];
  }
}

@Injectable()
export class SponsorsRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'sponsors',
    name: 'Sponsors / Support',
    description: 'GitHub Sponsors link badge.',
    category: 'community',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Sponsor Me', maxLength: 64 },
    ],
    requiredData: ['profile.githubLogin'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT'],
    defaultSettings: { title: 'Sponsor Me' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = String(settings['title'] || 'Sponsor Me');
    // SECURITY: the GitHub username for the sponsor link must come from the
    // authenticated render context. A user-supplied setting is NOT honored
    // because that would let any user publish a README that attributes the
    // sponsor link to an unrelated GitHub user.
    const username = context.profile?.githubLogin;
    if (!username) return [];
    const url = `https://github.com/sponsors/${encodeURIComponent(username)}`;
    return [
      heading(title, 2),
      { type: 'LINK' as any, content: title, metadata: { href: url, text: `github.com/sponsors/${username}` } },
    ];
  }
}
