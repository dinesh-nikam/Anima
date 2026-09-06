import { Injectable } from '@nestjs/common';
import { ReadmeBlock, RenderContext, ComponentConfig } from '../models/readme.model';
import { InvalidComponentConfigurationException } from '../exceptions/readme.exceptions';

// ---------------------------------------------------------------------------
// Component contract — every registered component must:
//   - Declare its id, name, category, version.
//   - Declare its supported settings (allowed keys + types).
//   - Declare required context fields (e.g. profile, statistics.contributions).
//   - Declare a default settings object.
//   - Declare fallback policy availability.
//   - Produce only IR blocks (ReadmeBlock[]) — never raw markdown.
// ---------------------------------------------------------------------------

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'object';

export interface SettingDefinition {
  name: string;
  type: SettingType;
  required: boolean;
  default?: unknown;
  enumValues?: string[];
  maxLength?: number;
  description?: string;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  settings: SettingDefinition[];
  requiredData: string[];
  supportedThemes: string[]; // empty = all
  fallbackPolicies: Array<'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE'>;
  defaultSettings: Record<string, unknown>;
  supportedProviders?: string[];
  defaultProvider?: string;
  providerCapabilities?: string[];
}

export interface ComponentRenderer {
  id: string;
  definition: ComponentDefinition;
  render(config: ComponentConfig, context: RenderContext): ReadmeBlock[];
}

@Injectable()
export class ReadmeComponentRegistry {
  private readonly renderers = new Map<string, ComponentRenderer>();

  register(renderer: ComponentRenderer) {
    this.renderers.set(renderer.id, renderer);
  }

  hasRenderer(id: string): boolean {
    return this.renderers.has(id);
  }

  getRenderer(id: string): ComponentRenderer {
    const renderer = this.renderers.get(id);
    if (!renderer) {
      throw new Error(`Component renderer not found for ID: ${id}`);
    }
    return renderer;
  }

  getDefinition(id: string): ComponentDefinition {
    return this.getRenderer(id).definition;
  }

  getAvailableComponents(): ComponentDefinition[] {
    return Array.from(this.renderers.values())
      .map((r) => r.definition)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getAvailableComponentIds(): string[] {
    return Array.from(this.renderers.keys()).sort();
  }

  validateConfiguration(componentId: string, config: ComponentConfig): void {
    const definition = this.getDefinition(componentId);
    const errors: Array<{ field: string; reason: string }> = [];
    const settings = config.settings || {};

    for (const field of definition.settings) {
      const value = settings[field.name];
      if (value === undefined || value === null) {
        if (field.required) {
          errors.push({ field: field.name, reason: 'required value missing' });
        }
        continue;
      }

      if (field.type === 'string' && typeof value !== 'string') {
        errors.push({ field: field.name, reason: 'expected string' });
        continue;
      }
      if (field.type === 'number' && typeof value !== 'number') {
        errors.push({ field: field.name, reason: 'expected number' });
        continue;
      }
      if (field.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field: field.name, reason: 'expected boolean' });
        continue;
      }
      if (field.type === 'enum') {
        if (typeof value !== 'string' || !field.enumValues?.includes(value)) {
          errors.push({
            field: field.name,
            reason: `expected one of ${(field.enumValues || []).join(',')}`,
          });
        }
      }
      if (field.type === 'string' && field.maxLength && typeof value === 'string') {
        if (value.length > field.maxLength) {
          errors.push({
            field: field.name,
            reason: `exceeds maximum length ${field.maxLength}`,
          });
        }
      }
    }

    // Reject unknown settings (strict)
    const knownFields = new Set(definition.settings.map((s) => s.name));
    for (const key of Object.keys(settings)) {
      if (!knownFields.has(key)) {
        errors.push({ field: key, reason: 'unknown setting' });
      }
    }

    // Cap total settings payload size (defense in depth)
    const serialized = JSON.stringify(settings);
    if (serialized.length > 4096) {
      errors.push({ field: '__settings__', reason: 'settings exceed 4096 bytes' });
    }

    if (errors.length > 0) {
      throw new InvalidComponentConfigurationException(componentId, errors);
    }
  }

  mergeWithDefaults(componentId: string, settings: Record<string, unknown>): Record<string, unknown> {
    const definition = this.getDefinition(componentId);
    const merged: Record<string, unknown> = {};
    for (const field of definition.settings) {
      if (settings[field.name] !== undefined) {
        merged[field.name] = settings[field.name];
      } else if (field.default !== undefined) {
        merged[field.name] = field.default;
      }
    }
    return merged;
  }
}
