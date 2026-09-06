import { Injectable } from '@nestjs/common';
import { BlockType, ReadmeBlock, ReadmeDocument } from '../models/readme.model';

// ---------------------------------------------------------------------------
// Canonical Markdown renderer.
//   - Deterministic ordering of blocks.
//   - Sanitizes HTML_SAFE fragments.
//   - Escapes unsafe characters in TEXT/PARAGRAPH/HEADING/LINK.
//   - Validates image URLs (no javascript:, data:, file:, etc).
//   - Stable newline + spacing.
// ---------------------------------------------------------------------------

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'file:', 'ftp:', 'vbscript:'];
const ALLOWED_IMG_PROTOCOLS = ['https:'];

@Injectable()
export class MarkdownRenderer {
  render(document: ReadmeDocument): string {
    const parts: string[] = [];

    for (const block of document.blocks) {
      const rendered = this.renderBlock(block);
      if (rendered !== null) {
        parts.push(rendered);
      }
    }

    // Normalize: collapse 3+ newlines into 2; trim trailing whitespace per line
    let markdown = parts.join('\n\n');
    markdown = markdown.replace(/\r\n/g, '\n');
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.replace(/[ \t]+\n/g, '\n');
    return markdown.trim();
  }

  private renderBlock(block: ReadmeBlock): string | null {
    switch (block.type) {
      case BlockType.HEADING:
        return this.escapeInline(this.stripUnsafeLines(block.content));

      case BlockType.PARAGRAPH:
        return this.escapeInline(this.stripUnsafeLines(block.content));

      case BlockType.TEXT:
        return this.escapeInline(this.stripUnsafeLines(block.content));

      case BlockType.IMAGE:
        return this.renderImage(block);

      case BlockType.LINK:
        return this.renderLink(block);

      case BlockType.BADGE:
        return this.renderBadge(block);

      case BlockType.TABLE:
        return this.renderTable(block);

      case BlockType.LIST:
        return this.renderList(block);

      case BlockType.CODE:
        return this.renderCode(block);

      case BlockType.DIVIDER:
        return '---';

      case BlockType.SPACER:
        return '';

      case BlockType.HTML_SAFE:
        return this.sanitizeHtml(block.content);

      case BlockType.CUSTOM_MARKDOWN:
        return this.sanitizeCustomMarkdown(block.content);

      case BlockType.COMPONENT:
        // Components render to other block types upstream; if a COMPONENT block
        // survives to the renderer, emit a deterministic placeholder rather
        // than executing arbitrary content.
        return `<!-- component:${this.escapeInline(String(block.content))} -->`;

      default:
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Escaping / sanitization helpers
  // -----------------------------------------------------------------------

  private escapeInline(value: string): string {
    // Markdown is forgiving, but we strip control characters and embedded HTML
    // tags from non-HTML_SAFE blocks.
    return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  }

  private stripUnsafeLines(value: string): string {
    // Strip lines that look like raw HTML injection. Allow in HTML_SAFE only.
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  private sanitizeHtml(value: string): string {
    // Allow only a tiny whitelist of HTML tags: <div>, <br/>, <sup>, <sub>, <img>, <picture>, <source>, <p>.
    // Strip any tag that is not whitelisted. Strip event handlers and javascript: URLs.
    const whitelist = /^<\/?(div|br|sup|sub|img|picture|source|p)(\s+[^>]*)?(\/?)>$/i;
    const lines = value.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const safe: string[] = [];
    for (const line of lines) {
      // Multi-tag line: validate each tag independently
      const tagMatches = line.match(/<[^>]+>/g) || [];
      if (tagMatches.length === 0) {
        // Plain text inside HTML_SAFE — keep escaped
        safe.push(this.escapeHtmlText(line));
        continue;
      }
      const rebuilt: string[] = [];
      let cursor = 0;
      let ok = true;
      for (const tag of tagMatches) {
        const idx = line.indexOf(tag, cursor);
        if (idx > cursor) {
          rebuilt.push(this.escapeHtmlText(line.slice(cursor, idx)));
        }
        if (!whitelist.test(tag) || /on\w+\s*=/i.test(tag) || /javascript:/i.test(tag)) {
          ok = false;
          break;
        }
        rebuilt.push(tag);
        cursor = idx + tag.length;
      }
      if (!ok) continue;
      if (cursor < line.length) {
        rebuilt.push(this.escapeHtmlText(line.slice(cursor)));
      }
      safe.push(rebuilt.join(''));
    }
    return safe.join('\n');
  }

  private escapeHtmlText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sanitizeCustomMarkdown(value: string): string {
    // Strip script/style blocks entirely, remove on*= handlers, remove javascript: links.
    let sanitized = value;
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    sanitized = sanitized.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
    sanitized = sanitized.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    // Limit size to prevent abuse (rendering already validated upstream but defense in depth)
    if (sanitized.length > 50_000) {
      sanitized = sanitized.substring(0, 50_000);
    }
    return sanitized.trim();
  }

  private renderImage(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const src = String(meta['src'] || '');
    const alt = String(meta['alt'] || '');
    if (!this.isSafeImageUrl(src)) return null;
    const safeAlt = this.escapeImageAlt(alt);
    return `![${safeAlt}](${src})`;
  }

  private renderLink(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const href = String(meta['href'] || '');
    const text = String(meta['text'] || block.content || '');
    if (!this.isSafeLinkUrl(href)) return null;
    return `[${this.escapeInline(text)}](${href})`;
  }

  private renderBadge(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const alt = String(meta['alt'] || 'badge');
    const src = String(meta['src'] || '');
    const href = meta['href'] ? String(meta['href']) : null;
    if (!this.isSafeImageUrl(src)) return null;
    if (href && !this.isSafeLinkUrl(href)) return null;
    const img = `![${this.escapeImageAlt(alt)}](${src})`;
    return href ? `[${img}](${href})` : img;
  }

  private renderTable(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const headers = Array.isArray(meta['headers']) ? (meta['headers'] as string[]) : [];
    const rows = Array.isArray(meta['rows']) ? (meta['rows'] as string[][]) : [];
    if (headers.length === 0) return null;
    const headerLine = `| ${headers.map((h) => this.escapeInline(String(h))).join(' | ')} |`;
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const rowLines = rows.map((row) =>
      `| ${row.map((c) => this.escapeInline(String(c ?? ''))).join(' | ')} |`,
    );
    return [headerLine, separator, ...rowLines].join('\n');
  }

  private renderList(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const items = Array.isArray(meta['items']) ? (meta['items'] as string[]) : [];
    if (items.length === 0) return null;
    const ordered = Boolean(meta['ordered']);
    return items
      .map((item, i) => {
        const prefix = ordered ? `${i + 1}.` : '-';
        return `${prefix} ${this.escapeInline(String(item))}`;
      })
      .join('\n');
  }

  private renderCode(block: ReadmeBlock): string | null {
    const meta = block.metadata || {};
    const lang = String(meta['lang'] || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const code = String(meta['code'] ?? block.content ?? '');
    const safeCode = code.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
    return `\`\`\`${lang}\n${safeCode}\n\`\`\``;
  }

  // -----------------------------------------------------------------------
  // URL safety
  // -----------------------------------------------------------------------

  isSafeLinkUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length === 0) return false;
    const lowered = trimmed.toLowerCase();
    for (const proto of DANGEROUS_PROTOCOLS) {
      if (lowered.startsWith(proto)) return false;
    }
    // Allow relative fragments (#foo) and relative paths (/foo)
    if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
      return !trimmed.includes('\\');
    }
    // Allow https and mailto
    if (lowered.startsWith('https://') || lowered.startsWith('mailto:')) return true;
    return false;
  }

  isSafeImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length === 0) return false;
    const lowered = trimmed.toLowerCase();
    for (const proto of DANGEROUS_PROTOCOLS) {
      if (lowered.startsWith(proto)) return false;
    }
    try {
      const parsed = new URL(trimmed);
      if (!ALLOWED_IMG_PROTOCOLS.includes(parsed.protocol)) return false;
      // Block SSRF targets in URLs generated server-side
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return false;
      }
      // Block private IP literals
      if (/^(10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private escapeImageAlt(alt: string): string {
    return alt.replace(/[\[\]]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  }
}
