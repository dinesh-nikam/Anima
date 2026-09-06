import { MarkdownRenderer } from '../../src/application/readme/renderers/markdown.renderer';
import { ReadmeDocument, BlockType } from '../../src/application/readme/models/readme.model';

describe('MarkdownRenderer', () => {
  let renderer: MarkdownRenderer;

  beforeEach(() => {
    renderer = new MarkdownRenderer();
  });

  it('renders a HEADING block as Markdown heading', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.HEADING, content: '# Hello' }],
    };
    expect(renderer.render(doc)).toBe('# Hello');
  });

  it('renders DIVIDER as hr', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.DIVIDER, content: '' }],
    };
    expect(renderer.render(doc)).toBe('---');
  });

  it('separates blocks with exactly one blank line', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [
        { type: BlockType.HEADING, content: '## A' },
        { type: BlockType.PARAGRAPH, content: 'body' },
      ],
    };
    expect(renderer.render(doc)).toBe('## A\n\nbody');
  });

  it('is deterministic for identical inputs', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [
        { type: BlockType.HEADING, content: '## X' },
        { type: BlockType.LIST, content: '', metadata: { items: ['a', 'b'], ordered: false } },
      ],
    };
    const first = renderer.render(doc);
    const second = renderer.render(doc);
    expect(first).toBe(second);
  });

  it('rejects javascript: in image URLs', () => {
    expect(renderer.isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(renderer.isSafeImageUrl('data:text/plain;base64,AAA')).toBe(false);
    expect(renderer.isSafeImageUrl('file:///etc/passwd')).toBe(false);
  });

  it('accepts https images', () => {
    expect(renderer.isSafeImageUrl('https://example.com/img.png')).toBe(true);
  });

  it('rejects http images', () => {
    expect(renderer.isSafeImageUrl('http://example.com/img.png')).toBe(false);
  });

  it('rejects localhost/private network image hosts', () => {
    expect(renderer.isSafeImageUrl('https://localhost/img.png')).toBe(false);
    expect(renderer.isSafeImageUrl('https://127.0.0.1/img.png')).toBe(false);
    expect(renderer.isSafeImageUrl('https://10.0.0.5/img.png')).toBe(false);
    expect(renderer.isSafeImageUrl('https://192.168.1.1/img.png')).toBe(false);
    expect(renderer.isSafeImageUrl('https://169.254.169.254/img.png')).toBe(false);
  });

  it('rejects javascript: in link URLs', () => {
    expect(renderer.isSafeLinkUrl('javascript:alert(1)')).toBe(false);
    expect(renderer.isSafeLinkUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('accepts relative links', () => {
    expect(renderer.isSafeLinkUrl('#section')).toBe(true);
    expect(renderer.isSafeLinkUrl('/about')).toBe(true);
  });

  it('strips <script> from CUSTOM_MARKDOWN', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.CUSTOM_MARKDOWN,
          content: 'hello<script>alert(1)</script>world',
        },
      ],
    });
    expect(md).not.toContain('<script>');
    expect(md).not.toContain('alert(1)');
  });

  it('strips on* handlers and javascript: in CUSTOM_MARKDOWN', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.CUSTOM_MARKDOWN,
          content: '<a href="javascript:alert(1)" onclick="bad()">x</a>',
        },
      ],
    });
    expect(md).not.toContain('javascript:');
    expect(md).not.toContain('onclick=');
  });

  it('truncates oversized CUSTOM_MARKDOWN', () => {
    const huge = 'x'.repeat(60_000);
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.CUSTOM_MARKDOWN, content: huge }],
    });
    expect(md.length).toBeLessThanOrEqual(50_000);
  });

  it('renders IMAGE blocks when URL is safe', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.IMAGE,
          content: 'desc',
          metadata: { src: 'https://example.com/x.png', alt: 'alt' },
        },
      ],
    };
    expect(renderer.render(doc)).toBe('![alt](https://example.com/x.png)');
  });

  it('drops IMAGE blocks when URL is unsafe', () => {
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.IMAGE,
          content: 'desc',
          metadata: { src: 'javascript:alert(1)', alt: 'alt' },
        },
      ],
    };
    expect(renderer.render(doc)).toBe('');
  });

  it('sanitizes HTML_SAFE: whitelists div/br/p, drops lines with event handlers', () => {
    // Whole-line drop because the line contains an event handler.
    const doc: ReadmeDocument = {
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.HTML_SAFE,
          content: '<div align="center" onclick="bad()">hello<br/></div>',
        },
      ],
    };
    const md = renderer.render(doc);
    expect(md).not.toContain('onclick');
    expect(md).not.toContain('bad()');
  });

  it('sanitizes HTML_SAFE: keeps div/br without event handlers', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.HTML_SAFE,
          content: '<div align="center">hello<br/></div>',
        },
      ],
    });
    expect(md).toContain('<div align="center">');
    expect(md).toContain('<br/>');
  });

  it('drops disallowed HTML tags in HTML_SAFE', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.HTML_SAFE,
          content: '<script>alert(1)</script>',
        },
      ],
    });
    expect(md).not.toContain('<script>');
  });

  it('renders LIST ordered/unordered deterministically', () => {
    const ul = renderer.render({
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.LIST, content: '', metadata: { items: ['a', 'b'], ordered: false } }],
    });
    expect(ul).toBe('- a\n- b');
    const ol = renderer.render({
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.LIST, content: '', metadata: { items: ['a', 'b'], ordered: true } }],
    });
    expect(ol).toBe('1. a\n2. b');
  });

  it('renders TABLE with header separator', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        {
          type: BlockType.TABLE,
          content: '',
          metadata: { headers: ['A', 'B'], rows: [['1', '2']] },
        },
      ],
    });
    expect(md).toContain('| A | B |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| 1 | 2 |');
  });

  it('renders CODE fenced block with language', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [
        { type: BlockType.CODE, content: '', metadata: { lang: 'ts', code: 'const x = 1;' } },
      ],
    });
    expect(md).toBe('```ts\nconst x = 1;\n```');
  });

  it('strips control characters from inline blocks', () => {
    const md = renderer.render({
      metadata: emptyMetadata(),
      blocks: [{ type: BlockType.PARAGRAPH, content: 'hello\u0000\u0007world' }],
    });
    expect(md).not.toContain('\u0000');
    expect(md).not.toContain('\u0007');
    expect(md).toContain('hello');
    expect(md).toContain('world');
  });
});

function emptyMetadata(): any {
  return {
    rendererVersion: '1.0.0',
    templateId: 't',
    templateVersion: '1',
    themeId: 'th',
    themeVersion: '1',
    componentVersions: {},
    providerVersions: {},
    generatedAt: new Date().toISOString(),
    dataCompleteness: 'PARTIAL',
    warnings: [],
  };
}

