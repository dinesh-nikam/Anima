import { Injectable } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Block Types — single source of truth for README IR blocks
// ---------------------------------------------------------------------------
export enum BlockType {
  HEADING = 'HEADING',
  PARAGRAPH = 'PARAGRAPH',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
  BADGE = 'BADGE',
  TABLE = 'TABLE',
  LIST = 'LIST',
  CODE = 'CODE',
  DIVIDER = 'DIVIDER',
  HTML_SAFE = 'HTML_SAFE',
  COMPONENT = 'COMPONENT',
  SPACER = 'SPACER',
  CUSTOM_MARKDOWN = 'CUSTOM_MARKDOWN',
}

// ---------------------------------------------------------------------------
// Availability semantics — NEVER silently coerce UNAVAILABLE to 0
// ---------------------------------------------------------------------------
export type AvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE';

export interface AvailabilityTagged<T> {
  status: AvailabilityStatus;
  value?: T;
  sourceUpdatedAt?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Fallback policies — explicit per-component
// ---------------------------------------------------------------------------
export type FallbackPolicy = 'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE';

// ---------------------------------------------------------------------------
// IR Blocks
// ---------------------------------------------------------------------------
export interface ReadmeBlock {
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ReadmeDocument {
  metadata: ReadmeMetadata;
  blocks: ReadmeBlock[];
}

export interface ReadmeMetadata {
  rendererVersion: string;
  templateId: string;
  templateVersion: string;
  themeId: string;
  themeVersion: string;
  componentVersions: Record<string, string>;
  providerVersions: Record<string, string>;
  generatedAt: string; // ISO; produced deterministically from server clock (excluded from body)
  sourceDataThrough?: string;
  dataCompleteness: AvailabilityStatus;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Section Configuration
// ---------------------------------------------------------------------------
export interface ComponentConfig {
  componentId: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  fallback?: FallbackPolicy;
}

// ---------------------------------------------------------------------------
// Render Context — only authoritative, sanitized data
// ---------------------------------------------------------------------------
export interface RenderContextProfile {
  displayName?: string;
  bio?: string;
  githubLogin?: string;
  avatarUrl?: string;
  profileUrl?: string;
  company?: string;
  location?: string;
  website?: string;
  twitterUsername?: string;
}

export interface RenderContextStatistics {
  repositories: AvailabilityTagged<number>;
  followers: AvailabilityTagged<number>;
  following: AvailabilityTagged<number>;
  stars: AvailabilityTagged<number>;
  forks: AvailabilityTagged<number>;
  contributions: AvailabilityTagged<number>;
  pullRequests: AvailabilityTagged<number>;
  issues: AvailabilityTagged<number>;
  reviews: AvailabilityTagged<number>;
}

export interface RenderContextStreak {
  current: AvailabilityTagged<number>;
  longest: AvailabilityTagged<number>;
}

export interface RenderContextLanguages {
  items: AvailabilityTagged<Array<{ name: string; percentage: number; bytes: number }>>;
}

export interface RenderContextRepositories {
  items: AvailabilityTagged<Array<{
    name: string;
    fullName: string;
    description?: string;
    url: string;
    stars: number;
    forks: number;
    language?: string;
    isArchived: boolean;
    isFork: boolean;
  }>>;
}

export interface RenderContextActivity {
  items: AvailabilityTagged<Array<{
    type: string;
    repositoryName?: string;
    summary?: string;
    url?: string;
    occurredAt: string;
  }>>;
}

export interface RenderContextAchievements {
  earned: AvailabilityTagged<Array<{
    code: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    icon?: string;
  }>>;
  inProgress: AvailabilityTagged<Array<{
    code: string;
    name: string;
    progressPercent: number;
  }>>;
}

export interface RenderContextTrophies {
  items: AvailabilityTagged<Array<{
    code: string;
    name: string;
    category: string;
    level: string;
    icon?: string;
  }>>;
}

export interface RenderContextSocialLinks {
  items: AvailabilityTagged<Array<{ label: string; url: string; icon?: string }>>;
}

export interface RenderContextCustomData {
  skills: AvailabilityTagged<string[]>;
  projects: AvailabilityTagged<Array<{ name: string; description?: string; url?: string }>>;
  currentFocus?: string;
  quote?: string;
  visitorCount?: AvailabilityTagged<number>;
}

export interface RenderContext {
  profile: RenderContextProfile;
  statistics: RenderContextStatistics;
  streak: RenderContextStreak;
  languages: RenderContextLanguages;
  repositories: RenderContextRepositories;
  activity: RenderContextActivity;
  achievements: RenderContextAchievements;
  trophies: RenderContextTrophies;
  socialLinks: RenderContextSocialLinks;
  customData: RenderContextCustomData;
  themeId: string;
  providerResults: Record<string, unknown>;
  renderMetadata: {
    rendererVersion: string;
    generatedAt: string;
  };
}

// ---------------------------------------------------------------------------
// Renderer version — single bump point for Phase 7 reproducibility
// ---------------------------------------------------------------------------
export const README_RENDERER_VERSION = '1.0.0';
