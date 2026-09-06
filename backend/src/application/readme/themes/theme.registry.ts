import { Injectable } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Theme definition — pure data, no behavior. Themes describe presentation
// configuration that components consume via ThemeContext. Themes do not
// contain component rendering logic.
// ---------------------------------------------------------------------------

export interface ThemePalette {
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  link: string;
  badge: string;
}

export interface ThemeTypography {
  heading: string;
  body: string;
  code: string;
}

export interface ThemeSpacing {
  sectionGap: number; // blank lines between sections
  paragraphGap: number;
  listIndent: number; // spaces
}

export interface ThemeAlignment {
  defaultImageAlignment: 'left' | 'center' | 'right';
  defaultHeroAlignment: 'left' | 'center' | 'right';
}

export interface ThemeStyle {
  headingPrefix: string; // markdown symbol e.g. "##"
  dividerStyle: 'hr' | 'blank' | 'thematic';
  tableStyle: 'github' | 'compact';
  codeBlockFenced: boolean;
  listBullet: '-' | '*';
}

export interface ThemeDefinition {
  themeId: string;
  themeKey: string;
  name: string;
  description: string;
  version: string;
  palette: ThemePalette;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  alignment: ThemeAlignment;
  style: ThemeStyle;
  componentDefaults: Record<string, Record<string, unknown>>;
}

export interface ThemeContext {
  theme: ThemeDefinition;
  resolved: {
    imageAlignment: 'left' | 'center' | 'right';
    heroAlignment: 'left' | 'center' | 'right';
    divider: string;
    listBullet: string;
  };
}

@Injectable()
export class ThemeRegistry {
  private readonly themes = new Map<string, ThemeDefinition>();

  constructor() {
    for (const theme of BUILT_IN_THEMES) {
      this.themes.set(theme.themeKey, theme);
    }
  }

  getByKey(key: string): ThemeDefinition | undefined {
    return this.themes.get(key);
  }

  getById(id: string): ThemeDefinition | undefined {
    for (const theme of this.themes.values()) {
      if (theme.themeId === id) return theme;
    }
    return undefined;
  }

  list(): ThemeDefinition[] {
    return Array.from(this.themes.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  resolve(themeKey: string): ThemeContext {
    const theme = this.themes.get(themeKey);
    if (!theme) {
      // Fall back to github-dark; never fail rendering for a missing theme
      const fallback = this.themes.get('github-dark')!;
      return this.buildContext(fallback);
    }
    return this.buildContext(theme);
  }

  private buildContext(theme: ThemeDefinition): ThemeContext {
    return {
      theme,
      resolved: {
        imageAlignment: theme.alignment.defaultImageAlignment,
        heroAlignment: theme.alignment.defaultHeroAlignment,
        divider: theme.style.dividerStyle === 'hr' ? '---' : '',
        listBullet: theme.style.listBullet,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Built-in theme catalog. Themes describe configuration only — no proprietary
// assets, branding, or logos are embedded.
// ---------------------------------------------------------------------------

const BUILT_IN_THEMES: ThemeDefinition[] = [
  {
    themeId: 'theme-github-light',
    themeKey: 'github-light',
    name: 'GitHub Light',
    description: 'Clean light theme inspired by the default GitHub palette.',
    version: '1.0.0',
    palette: {
      primary: '#0969DA',
      accent: '#8250DF',
      background: '#FFFFFF',
      text: '#1F2328',
      muted: '#59636E',
      border: '#D1D9E0',
      link: '#0969DA',
      badge: '#0969DA',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'SFMono-Regular, Menlo, monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'left' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-github-dark',
    themeKey: 'github-dark',
    name: 'GitHub Dark',
    description: 'Dark variant with high-contrast accents.',
    version: '1.0.0',
    palette: {
      primary: '#58A6FF',
      accent: '#BC8CFF',
      background: '#0D1117',
      text: '#E6EDF3',
      muted: '#8B949E',
      border: '#30363D',
      link: '#58A6FF',
      badge: '#58A6FF',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'SFMono-Regular, Menlo, monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'left' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-tokyo-night',
    themeKey: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Cool blue/indigo palette reminiscent of late-night coding.',
    version: '1.0.0',
    palette: {
      primary: '#7AA2F7',
      accent: '#BB9AF7',
      background: '#1A1B26',
      text: '#C0CAF5',
      muted: '#565F89',
      border: '#292E42',
      link: '#7AA2F7',
      badge: '#7AA2F7',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'JetBrains Mono, monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'center' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-dracula',
    themeKey: 'dracula',
    name: 'Dracula',
    description: 'High-contrast purple-forward dark palette.',
    version: '1.0.0',
    palette: {
      primary: '#BD93F9',
      accent: '#FF79C6',
      background: '#282A36',
      text: '#F8F8F2',
      muted: '#6272A4',
      border: '#44475A',
      link: '#8BE9FD',
      badge: '#FF79C6',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'Fira Code, monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'center' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-nord',
    themeKey: 'nord',
    name: 'Nord',
    description: 'Arctic-inspired muted blue/green palette.',
    version: '1.0.0',
    palette: {
      primary: '#88C0D0',
      accent: '#81A1C1',
      background: '#2E3440',
      text: '#ECEFF4',
      muted: '#4C566A',
      border: '#3B4252',
      link: '#88C0D0',
      badge: '#A3BE8C',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'JetBrains Mono, monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'left' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-monochrome',
    themeKey: 'monochrome',
    name: 'Monochrome',
    description: 'Minimal black-and-white palette for maximum portability.',
    version: '1.0.0',
    palette: {
      primary: '#000000',
      accent: '#444444',
      background: '#FFFFFF',
      text: '#000000',
      muted: '#666666',
      border: '#CCCCCC',
      link: '#000000',
      badge: '#000000',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'left', defaultHeroAlignment: 'left' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'compact',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-cyberpunk',
    themeKey: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Vibrant neon yellow/magenta on deep dark.',
    version: '1.0.0',
    palette: {
      primary: '#FCEE0A',
      accent: '#FF003C',
      background: '#0B0033',
      text: '#F2F2F2',
      muted: '#999999',
      border: '#FF003C',
      link: '#FCEE0A',
      badge: '#FF003C',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'center', defaultHeroAlignment: 'center' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
  {
    themeId: 'theme-professional',
    themeKey: 'professional',
    name: 'Professional',
    description: 'Conservative navy and slate palette for formal contexts.',
    version: '1.0.0',
    palette: {
      primary: '#1F3A5F',
      accent: '#4A6FA5',
      background: '#FFFFFF',
      text: '#1A1A1A',
      muted: '#555555',
      border: '#D9DDE3',
      link: '#1F3A5F',
      badge: '#1F3A5F',
    },
    typography: {
      heading: 'inherit',
      body: 'inherit',
      code: 'monospace',
    },
    spacing: { sectionGap: 1, paragraphGap: 1, listIndent: 2 },
    alignment: { defaultImageAlignment: 'left', defaultHeroAlignment: 'left' },
    style: {
      headingPrefix: '##',
      dividerStyle: 'hr',
      tableStyle: 'github',
      codeBlockFenced: true,
      listBullet: '-',
    },
    componentDefaults: {},
  },
];
