import { Injectable } from '@nestjs/common';
import { ComponentRenderer, ComponentDefinition } from '../registry/component-registry.service';
import { ReadmeBlock, RenderContext, ComponentConfig, BlockType } from '../models/readme.model';
import { cleanText, heading, paragraph, wrapWithAlignment, unavailableBlock } from './component-helpers';

@Injectable()
export class HeroRenderer implements ComponentRenderer {
  readonly definition: ComponentDefinition = {
    id: 'hero',
    name: 'Hero',
    description: 'Profile heading with optional bio and alignment.',
    category: 'profile',
    version: '1.0.0',
    settings: [
      {
        name: 'alignment',
        type: 'enum',
        required: false,
        default: 'left',
        enumValues: ['left', 'center', 'right'],
        description: 'Layout alignment for the hero block',
      },
      {
        name: 'showBio',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Display the profile bio beneath the heading',
      },
      {
        name: 'showAvatar',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Display the avatar image above the heading',
      },
    ],
    requiredData: ['profile.displayName'],
    supportedThemes: [],
    fallbackPolicies: ['HIDE_COMPONENT', 'RENDER_FALLBACK'],
    defaultSettings: { alignment: 'left', showBio: true, showAvatar: false },
  };

  get id() {
    return this.definition.id;
  }

  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[] {
    const settings = config.settings as Record<string, unknown>;
    const alignment = (settings['alignment'] as 'left' | 'center' | 'right') || 'left';
    const showBio = settings['showBio'] !== false;
    const showAvatar = settings['showAvatar'] === true;

    const displayName = cleanText(context.profile?.displayName);
    if (!displayName) {
      if (config.fallback === 'RENDER_UNAVAILABLE') {
        return [unavailableBlock('Profile identity')];
      }
      if (config.fallback === 'HIDE_COMPONENT' || !config.fallback) {
        return [];
      }
      return [unavailableBlock('Profile identity')];
    }

    const blocks: ReadmeBlock[] = [];

    if (showAvatar && context.profile?.avatarUrl) {
      blocks.push({
        type: BlockType.IMAGE,
        content: 'Avatar',
        metadata: { src: context.profile.avatarUrl, alt: displayName },
      });
    }

    blocks.push(heading(displayName, 1));

    if (showBio) {
      const bio = cleanText(context.profile?.bio);
      if (bio) {
        blocks.push(paragraph(bio));
      }
    }

    return wrapWithAlignment(blocks, alignment);
  }
}
