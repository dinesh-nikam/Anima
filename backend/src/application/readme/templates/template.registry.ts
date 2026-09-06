import { Injectable } from '@nestjs/common';
import { ThemeDefinition } from '../themes/theme.registry';

// ---------------------------------------------------------------------------
// Template — a composition of reusable sections that reference registered
// components. Templates are pure data; they contain no Markdown strings.
// ---------------------------------------------------------------------------

export interface TemplateSectionSpec {
  sectionKey: string;
  componentKey: string;
  displayOrder: number;
  enabled: boolean;
  configuration: Record<string, unknown>;
  schemaVersion: string;
}

export interface TemplateDefinition {
  templateKey: string;
  name: string;
  description: string;
  version: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'DISABLED';
  themeKey: string;
  configuration: Record<string, unknown>;
  schemaVersion: string;
  isSystem: boolean;
  sections: TemplateSectionSpec[];
}

@Injectable()
export class TemplateRegistry {
  private readonly templates = new Map<string, TemplateDefinition>();

  constructor() {
    for (const t of BUILT_IN_TEMPLATES) {
      this.templates.set(t.templateKey, t);
    }
  }

  getByKey(key: string): TemplateDefinition | undefined {
    return this.templates.get(key);
  }

  list(includeDisabled = false): TemplateDefinition[] {
    const all = Array.from(this.templates.values());
    const filtered = includeDisabled ? all : all.filter((t) => t.status !== 'DISABLED');
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  resolve(templateKey: string, themeKey?: string): TemplateDefinition | undefined {
    const t = this.templates.get(templateKey);
    if (!t) return undefined;
    if (!themeKey) return t;
    return { ...t, themeKey };
  }
}

// ---------------------------------------------------------------------------
// Curated system templates — structural configuration only, no personal data.
// ---------------------------------------------------------------------------

const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    templateKey: 'professional-developer',
    name: 'Professional Developer',
    description: 'Polished layout emphasising identity, skills, analytics, and contact.',
    version: '1.0.0',
    status: 'PUBLISHED',
    themeKey: 'github-light',
    schemaVersion: '1.0.0',
    isSystem: true,
    configuration: {},
    sections: [
      { sectionKey: 'hero', componentKey: 'hero', displayOrder: 0, enabled: true, configuration: { alignment: 'left', showBio: true, showAvatar: false }, schemaVersion: '1.0.0' },
      { sectionKey: 'about', componentKey: 'about', displayOrder: 1, enabled: true, configuration: { alignment: 'left', title: 'About Me' }, schemaVersion: '1.0.0' },
      { sectionKey: 'skills', componentKey: 'skills', displayOrder: 2, enabled: true, configuration: { title: 'Skills', source: 'languages' }, schemaVersion: '1.0.0' },
      { sectionKey: 'github-stats', componentKey: 'github-stats', displayOrder: 3, enabled: true, configuration: { theme: 'default', showIcons: true, alignment: 'center', title: 'GitHub Stats' }, schemaVersion: '1.0.0' },
      { sectionKey: 'top-languages', componentKey: 'top-languages', displayOrder: 4, enabled: true, configuration: { layout: 'compact', theme: 'default', alignment: 'center', title: 'Top Languages' }, schemaVersion: '1.0.0' },
      { sectionKey: 'featured-projects', componentKey: 'featured-projects', displayOrder: 5, enabled: true, configuration: { title: 'Featured Projects', limit: 4 }, schemaVersion: '1.0.0' },
      { sectionKey: 'achievements', componentKey: 'achievements', displayOrder: 6, enabled: true, configuration: { title: 'Achievements', alignment: 'left' }, schemaVersion: '1.0.0' },
      { sectionKey: 'contact', componentKey: 'contact', displayOrder: 7, enabled: true, configuration: { title: 'Get in touch' }, schemaVersion: '1.0.0' },
      { sectionKey: 'footer', componentKey: 'footer', displayOrder: 8, enabled: true, configuration: { text: 'Thanks for visiting' }, schemaVersion: '1.0.0' },
    ],
  },
  {
    templateKey: 'open-source-developer',
    name: 'Open Source Developer',
    description: 'Highlights contribution velocity, streaks, and open-source activity.',
    version: '1.0.0',
    status: 'PUBLISHED',
    themeKey: 'tokyo-night',
    schemaVersion: '1.0.0',
    isSystem: true,
    configuration: {},
    sections: [
      { sectionKey: 'hero', componentKey: 'hero', displayOrder: 0, enabled: true, configuration: { alignment: 'center', showBio: true, showAvatar: false }, schemaVersion: '1.0.0' },
      { sectionKey: 'current-focus', componentKey: 'current-focus', displayOrder: 1, enabled: true, configuration: { title: 'Open Source Focus' }, schemaVersion: '1.0.0' },
      { sectionKey: 'contribution-stats', componentKey: 'contribution-stats', displayOrder: 2, enabled: true, configuration: { title: 'Contributions', alignment: 'center' }, schemaVersion: '1.0.0' },
      { sectionKey: 'streak-stats', componentKey: 'streak-stats', displayOrder: 3, enabled: true, configuration: { theme: 'tokyonight', alignment: 'center', title: 'Streak' }, schemaVersion: '1.0.0' },
      { sectionKey: 'github-stats', componentKey: 'github-stats', displayOrder: 4, enabled: true, configuration: { theme: 'tokyonight', showIcons: true, alignment: 'center', title: 'GitHub Stats' }, schemaVersion: '1.0.0' },
      { sectionKey: 'featured-projects', componentKey: 'featured-projects', displayOrder: 5, enabled: true, configuration: { title: 'Top Projects', limit: 6 }, schemaVersion: '1.0.0' },
      { sectionKey: 'pull-requests', componentKey: 'pull-requests', displayOrder: 6, enabled: true, configuration: { title: 'Pull Requests' }, schemaVersion: '1.0.0' },
      { sectionKey: 'issues', componentKey: 'issues', displayOrder: 7, enabled: true, configuration: { title: 'Issues' }, schemaVersion: '1.0.0' },
      { sectionKey: 'trophy-wall', componentKey: 'trophy-wall', displayOrder: 8, enabled: true, configuration: { theme: 'tokyonight', alignment: 'center', title: 'Trophies', noFrame: false }, schemaVersion: '1.0.0' },
      { sectionKey: 'visitor-counter', componentKey: 'visitor-counter', displayOrder: 9, enabled: true, configuration: { color: 'blue', page: 'profile', alignment: 'right' }, schemaVersion: '1.0.0' },
    ],
  },
  {
    templateKey: 'minimal',
    name: 'Minimal',
    description: 'Compact profile: hero, about, skills, projects, stats.',
    version: '1.0.0',
    status: 'PUBLISHED',
    themeKey: 'monochrome',
    schemaVersion: '1.0.0',
    isSystem: true,
    configuration: {},
    sections: [
      { sectionKey: 'hero', componentKey: 'hero', displayOrder: 0, enabled: true, configuration: { alignment: 'left', showBio: false, showAvatar: false }, schemaVersion: '1.0.0' },
      { sectionKey: 'about', componentKey: 'about', displayOrder: 1, enabled: true, configuration: { alignment: 'left', title: 'About' }, schemaVersion: '1.0.0' },
      { sectionKey: 'skills', componentKey: 'skills', displayOrder: 2, enabled: true, configuration: { title: 'Skills', source: 'languages' }, schemaVersion: '1.0.0' },
      { sectionKey: 'featured-projects', componentKey: 'featured-projects', displayOrder: 3, enabled: true, configuration: { title: 'Projects', limit: 4 }, schemaVersion: '1.0.0' },
      { sectionKey: 'github-stats', componentKey: 'github-stats', displayOrder: 4, enabled: true, configuration: { theme: 'default', showIcons: false, alignment: 'left', title: 'GitHub Stats' }, schemaVersion: '1.0.0' },
      { sectionKey: 'footer', componentKey: 'footer', displayOrder: 5, enabled: true, configuration: { text: 'Thanks for visiting' }, schemaVersion: '1.0.0' },
    ],
  },
  {
    templateKey: 'technical-portfolio',
    name: 'Technical Portfolio',
    description: 'Full portfolio with skills, experience hooks, projects, analytics.',
    version: '1.0.0',
    status: 'PUBLISHED',
    themeKey: 'professional',
    schemaVersion: '1.0.0',
    isSystem: true,
    configuration: {},
    sections: [
      { sectionKey: 'hero', componentKey: 'hero', displayOrder: 0, enabled: true, configuration: { alignment: 'left', showBio: true, showAvatar: false }, schemaVersion: '1.0.0' },
      { sectionKey: 'about', componentKey: 'about', displayOrder: 1, enabled: true, configuration: { alignment: 'left', title: 'About' }, schemaVersion: '1.0.0' },
      { sectionKey: 'skills', componentKey: 'skills', displayOrder: 2, enabled: true, configuration: { title: 'Skills', source: 'languages' }, schemaVersion: '1.0.0' },
      { sectionKey: 'featured-projects', componentKey: 'featured-projects', displayOrder: 3, enabled: true, configuration: { title: 'Projects', limit: 6 }, schemaVersion: '1.0.0' },
      { sectionKey: 'github-stats', componentKey: 'github-stats', displayOrder: 4, enabled: true, configuration: { theme: 'default', showIcons: true, alignment: 'left', title: 'GitHub Analytics' }, schemaVersion: '1.0.0' },
      { sectionKey: 'achievements', componentKey: 'achievements', displayOrder: 5, enabled: true, configuration: { title: 'Achievements', alignment: 'left' }, schemaVersion: '1.0.0' },
      { sectionKey: 'contact', componentKey: 'contact', displayOrder: 6, enabled: true, configuration: { title: 'Contact' }, schemaVersion: '1.0.0' },
    ],
  },
];
