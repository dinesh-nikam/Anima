import { ReadmeBlock, BlockType, RenderContext, AvailabilityStatus } from '../models/readme.model';

// ---------------------------------------------------------------------------
// Shared helpers used by every component renderer.
// ---------------------------------------------------------------------------

/**
 * Wraps an array of blocks in <div align="..."> for centered layouts.
 * The HTML_SAFE blocks are sanitized later by the markdown renderer.
 */
export function wrapWithAlignment(blocks: ReadmeBlock[], alignment: 'left' | 'center' | 'right'): ReadmeBlock[] {
  if (alignment === 'left') return blocks;
  const open: ReadmeBlock = { type: BlockType.HTML_SAFE, content: `<div align="${alignment}">` };
  const close: ReadmeBlock = { type: BlockType.HTML_SAFE, content: '</div>' };
  return [open, ...blocks, close];
}

/**
 * Returns the unwrapped value or null when the data is unavailable/partial
 * unless the caller has opted into PARTIAL.
 */
export function unwrapAvailable<T>(
  tagged: { status: AvailabilityStatus; value?: T } | undefined,
  accept: AvailabilityStatus[] = ['AVAILABLE'],
): T | null {
  if (!tagged) return null;
  if (!accept.includes(tagged.status)) return null;
  return (tagged.value ?? null) as T | null;
}

export function unwrapOrUndefined<T>(
  tagged: { status: AvailabilityStatus; value?: T } | undefined,
  accept: AvailabilityStatus[] = ['AVAILABLE'],
): T | undefined {
  return unwrapAvailable<T>(tagged, accept) ?? undefined;
}

/**
 * Safely get a context slice; never throws.
 */
export function safeContext<T>(loader: () => T, fallback: T): T {
  try {
    const v = loader();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

/**
 * Build an "unavailable" notice block — visible but explicit.
 */
export function unavailableBlock(label: string): ReadmeBlock {
  return {
    type: BlockType.PARAGRAPH,
    content: `> _${label} data is currently unavailable._`,
  };
}

export function heading(text: string, level = 2): ReadmeBlock {
  const prefix = level === 1 ? '#' : level === 2 ? '##' : level === 3 ? '###' : '####';
  return { type: BlockType.HEADING, content: `${prefix} ${text}` };
}

export function paragraph(text: string): ReadmeBlock {
  return { type: BlockType.PARAGRAPH, content: text };
}

export function divider(): ReadmeBlock {
  return { type: BlockType.DIVIDER, content: '' };
}

export function link(href: string, text: string): ReadmeBlock {
  return {
    type: BlockType.LINK,
    content: text,
    metadata: { href, text },
  };
}

export function badge(src: string, alt: string, href?: string): ReadmeBlock {
  return {
    type: BlockType.BADGE,
    content: alt,
    metadata: { src, alt, href },
  };
}

export function image(src: string, alt: string): ReadmeBlock {
  return {
    type: BlockType.IMAGE,
    content: alt,
    metadata: { src, alt },
  };
}

export function list(items: string[], ordered = false): ReadmeBlock {
  return {
    type: BlockType.LIST,
    content: '',
    metadata: { items, ordered },
  };
}

export function table(headers: string[], rows: string[][]): ReadmeBlock {
  return {
    type: BlockType.TABLE,
    content: '',
    metadata: { headers, rows },
  };
}

export function spacer(): ReadmeBlock {
  return { type: BlockType.SPACER, content: '' };
}

export function customMarkdown(content: string): ReadmeBlock {
  return { type: BlockType.CUSTOM_MARKDOWN, content };
}

/**
 * Sanitize user-controlled text for use in a heading or paragraph.
 */
export function cleanText(value: string | undefined | null, maxLen = 256): string {
  if (!value) return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, maxLen);
}
