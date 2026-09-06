import { ReadmeDiffService } from '../../src/application/readme/services/readme-diff.service';

describe('ReadmeDiffService', () => {
  let diffService: ReadmeDiffService;

  beforeEach(() => {
    diffService = new ReadmeDiffService();
  });

  describe('generateContentHash', () => {
    it('should generate consistent SHA-256 hash regardless of line ending format (CRLF vs LF)', () => {
      const contentLf = '# Title\n\nSome text\n- Item 1\n- Item 2\n';
      const contentCrlf = '# Title\r\n\r\nSome text\r\n- Item 1\r\n- Item 2\r\n';

      const hashLf = diffService.generateContentHash(contentLf);
      const hashCrlf = diffService.generateContentHash(contentCrlf);

      expect(hashLf).toBeDefined();
      expect(hashLf.length).toBe(64);
      expect(hashLf).toEqual(hashCrlf);
    });

    it('should generate different hashes for distinct content', () => {
      const hash1 = diffService.generateContentHash('# Version 1');
      const hash2 = diffService.generateContentHash('# Version 2');

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('calculateDiff — Initial File Creation', () => {
    it('should report CREATED with all lines added when current content is null', () => {
      const newContent = '# Welcome\nThis is my profile README.\n\nEnjoy!';
      const result = diffService.calculateDiff(null, newContent);

      expect(result.summary.status).toBe('CREATED');
      expect(result.summary.additions).toBe(4);
      expect(result.summary.deletions).toBe(0);
      expect(result.summary.unchanged).toBe(0);
      expect(result.summary.isNoOp).toBe(false);
      expect(result.summary.currentHash).toBeNull();
      expect(result.summary.renderedHash).toBe(diffService.generateContentHash(newContent));
      expect(result.lines.every((l) => l.type === 'ADDED')).toBe(true);
    });

    it('should report CREATED with all lines added when current content is undefined', () => {
      const newContent = '# Hello World';
      const result = diffService.calculateDiff(undefined, newContent);

      expect(result.summary.status).toBe('CREATED');
      expect(result.summary.additions).toBe(1);
      expect(result.lines[0].type).toBe('ADDED');
      expect(result.lines[0].content).toBe('# Hello World');
    });
  });

  describe('calculateDiff — No-Op (Identical Content)', () => {
    it('should report UNCHANGED with zero additions/deletions when contents match', () => {
      const content = '# My Profile\nFull stack engineer.\n\n### Skills\n- TypeScript\n- PostgreSQL';
      const result = diffService.calculateDiff(content, content);

      expect(result.summary.status).toBe('UNCHANGED');
      expect(result.summary.additions).toBe(0);
      expect(result.summary.deletions).toBe(0);
      expect(result.summary.unchanged).toBe(6);
      expect(result.summary.isNoOp).toBe(true);
      expect(result.lines.every((l) => l.type === 'UNCHANGED')).toBe(true);
    });

    it('should treat CRLF and LF variations of identical text as UNCHANGED', () => {
      const contentLf = 'Line 1\nLine 2\nLine 3';
      const contentCrlf = 'Line 1\r\nLine 2\r\nLine 3';

      const result = diffService.calculateDiff(contentCrlf, contentLf);
      expect(result.summary.status).toBe('UNCHANGED');
      expect(result.summary.isNoOp).toBe(true);
    });
  });

  describe('calculateDiff — Changed Content', () => {
    it('should accurately detect line additions, modifications, and deletions', () => {
      const oldContent = 'Line 1\nLine 2 (old)\nLine 3\nLine 4';
      const newContent = 'Line 1\nLine 2 (new)\nLine 3\nLine 5 (added)';

      const result = diffService.calculateDiff(oldContent, newContent);

      expect(result.summary.status).toBe('CHANGED');
      expect(result.summary.isNoOp).toBe(false);
      expect(result.summary.additions).toBeGreaterThan(0);
      expect(result.summary.deletions).toBeGreaterThan(0);

      // Check line types
      const addedLines = result.lines.filter((l) => l.type === 'ADDED');
      const removedLines = result.lines.filter((l) => l.type === 'REMOVED');
      const unchangedLines = result.lines.filter((l) => l.type === 'UNCHANGED');

      expect(addedLines.length).toBe(result.summary.additions);
      expect(removedLines.length).toBe(result.summary.deletions);
      expect(unchangedLines.length).toBe(result.summary.unchanged);
    });

    it('should handle pure line additions', () => {
      const oldContent = 'Line 1\nLine 2';
      const newContent = 'Line 1\nLine 2\nLine 3\nLine 4';

      const result = diffService.calculateDiff(oldContent, newContent);

      expect(result.summary.status).toBe('CHANGED');
      expect(result.summary.additions).toBe(2);
      expect(result.summary.deletions).toBe(0);
      expect(result.summary.unchanged).toBe(2);
    });

    it('should handle pure line deletions', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3\nLine 4';
      const newContent = 'Line 1\nLine 4';

      const result = diffService.calculateDiff(oldContent, newContent);

      expect(result.summary.status).toBe('CHANGED');
      expect(result.summary.additions).toBe(0);
      expect(result.summary.deletions).toBe(2);
      expect(result.summary.unchanged).toBe(2);
    });
  });
});
