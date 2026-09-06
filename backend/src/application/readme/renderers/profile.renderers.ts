import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { cleanText, heading, paragraph, wrapWithAlignment, unavailableBlock } from './component-helpers';

@Injectable()
export class AboutRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'about',
    name: 'About Me',
    description: 'Long-form about-me block using the profile bio.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      { name: 'alignment', type: 'enum', required: false, default: 'left', enumValues: ['left', 'center', 'right'] },
      { name: 'title', type: 'string', required: false, default: 'About Me', maxLength: 64 },
    ],
    requiredData: ['profile.bio'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK', 'RENDER_UNAVAILABLE'],
    defaultSettings: { alignment: 'left', title: 'About Me' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'left';
    const title = cleanText(String(settings['title'] || 'About Me'), 64);
    const bio = cleanText(context.profile?.bio, 2000);
    if (!bio) {
      if (config.fallback === 'RENDER_UNAVAILABLE') return [unavailableBlock('About bio')];
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('About bio')];
    }
    const blocks = [heading(title, 2), paragraph(bio)];
    return wrapWithAlignment(blocks, alignment);
  }
}

@Injectable()
export class ProfileSummaryRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'profile-summary',
    name: 'Profile Summary',
    description: 'Compact multi-line summary: company, location, website.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Profile', maxLength: 64 },
    ],
    requiredData: ['profile'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Profile' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || 'Profile'), 64);
    const p = context.profile || {};
    const rows: string[] = [];
    if (p.company) rows.push(`**Company:** ${cleanText(p.company)}`);
    if (p.location) rows.push(`**Location:** ${cleanText(p.location)}`);
    if (p.website) rows.push(`**Website:** ${cleanText(p.website)}`);
    if (p.twitterUsername) rows.push(`**Twitter:** @${cleanText(p.twitterUsername)}`);
    if (rows.length === 0) {
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('Profile summary')];
    }
    return [heading(title, 2), ...rows.map((r) => paragraph(r))];
  }
}

@Injectable()
export class SocialLinksRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'social-links',
    name: 'Social Links',
    description: 'Render social/profile links as badges.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Connect with me', maxLength: 64 },
      { name: 'alignment', type: 'enum', required: false, default: 'left', enumValues: ['left', 'center', 'right'] },
    ],
    requiredData: ['socialLinks'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Connect with me', alignment: 'left' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || 'Connect with me'), 64);
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'left';
    const items = context.socialLinks?.items;
    if (!items || items.status !== 'AVAILABLE' || !items.value || items.value.length === 0) {
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('Social links')];
    }
    const safeItems = items.value.filter((s) => /^https?:\/\//i.test(s.url));
    if (safeItems.length === 0) {
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('Social links')];
    }
    const blocks: ReadmeBlock[] = [heading(title, 2)];
    for (const item of safeItems) {
      blocks.push({
        type: 'LINK' as any,
        content: item.label,
        metadata: { href: item.url, text: item.label },
      });
    }
    return wrapWithAlignment(blocks, alignment);
  }
}

@Injectable()
export class ContactRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'contact',
    name: 'Contact',
    description: 'Contact information block.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Get in touch', maxLength: 64 },
    ],
    requiredData: ['profile'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Get in touch' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || 'Get in touch'), 64);
    const p = context.profile || {};
    const rows: string[] = [];
    if (p.githubLogin) {
      const url = `https://github.com/${encodeURIComponent(p.githubLogin)}`;
      rows.push(`**GitHub:** [${p.githubLogin}](${url})`);
    }
    if (p.website) {
      rows.push(`**Website:** ${cleanText(p.website)}`);
    }
    if (p.twitterUsername) {
      rows.push(`**Twitter:** [@${cleanText(p.twitterUsername)}](https://twitter.com/${encodeURIComponent(p.twitterUsername)})`);
    }
    if (rows.length === 0) {
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('Contact details')];
    }
    return [heading(title, 2), ...rows.map((r) => paragraph(r))];
  }
}

@Injectable()
export class CurrentFocusRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'current-focus',
    name: 'Current Focus',
    description: 'Short statement of current focus area.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      { name: 'title', type: 'string', required: false, default: 'Current Focus', maxLength: 64 },
    ],
    requiredData: ['customData.currentFocus'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { title: 'Current Focus' },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const title = cleanText(String(settings['title'] || 'Current Focus'), 64);
    const focus = cleanText(context.customData?.currentFocus, 280);
    if (!focus) {
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) return [];
      return [unavailableBlock('Current focus')];
    }
    return [heading(title, 2), paragraph(focus)];
  }
}
