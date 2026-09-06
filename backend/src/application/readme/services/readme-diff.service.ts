import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export type DiffChangeStatus = 'CREATED' | 'CHANGED' | 'UNCHANGED';

export type DiffLineType = 'ADDED' | 'REMOVED' | 'UNCHANGED' | 'HEADER';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffSummary {
  status: DiffChangeStatus;
  additions: number;
  deletions: number;
  unchanged: number;
  totalChanges: number;
  isNoOp: boolean;
  truncated: boolean;
  renderedHash: string;
  currentHash: string | null;
}

export interface ReadmeDiffResult {
  summary: DiffSummary;
  lines: DiffLine[];
}

@Injectable()
export class ReadmeDiffService {
  private readonly MAX_DIFF_LINES = 4000;

  /**
   * Normalizes content by standardizing line breaks to LF (\n)
   */
  normalizeContent(content: string): string {
    if (!content) return '';
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Computes deterministic SHA-256 hash of normalized Markdown content
   */
  generateContentHash(content: string): string {
    const normalized = this.normalizeContent(content);
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Calculates structured line diff between existing GitHub README content and new rendered Markdown
   */
  calculateDiff(currentContent: string | null | undefined, newContent: string): ReadmeDiffResult {
    const normalizedNew = this.normalizeContent(newContent);
    const renderedHash = this.generateContentHash(normalizedNew);

    // Case 1: Target file does not exist on GitHub (Initial Creation)
    if (currentContent === null || currentContent === undefined) {
      const newLines = normalizedNew.length > 0 ? normalizedNew.split('\n') : [];
      const lines: DiffLine[] = [];
      let truncated = false;

      const limit = Math.min(newLines.length, this.MAX_DIFF_LINES);
      for (let i = 0; i < limit; i++) {
        lines.push({
          type: 'ADDED',
          content: newLines[i],
          newLineNumber: i + 1,
        });
      }

      if (newLines.length > this.MAX_DIFF_LINES) {
        truncated = true;
        lines.push({
          type: 'HEADER',
          content: `... Diff truncated (${newLines.length - this.MAX_DIFF_LINES} more added lines) ...`,
        });
      }

      return {
        summary: {
          status: 'CREATED',
          additions: newLines.length,
          deletions: 0,
          unchanged: 0,
          totalChanges: newLines.length,
          isNoOp: false,
          truncated,
          renderedHash,
          currentHash: null,
        },
        lines,
      };
    }

    const normalizedCurrent = this.normalizeContent(currentContent);
    const currentHash = this.generateContentHash(normalizedCurrent);

    // Case 2: Identical Content (No-Op)
    if (normalizedCurrent === normalizedNew) {
      const currentLines = normalizedCurrent.length > 0 ? normalizedCurrent.split('\n') : [];
      const lines: DiffLine[] = [];
      const limit = Math.min(currentLines.length, this.MAX_DIFF_LINES);

      for (let i = 0; i < limit; i++) {
        lines.push({
          type: 'UNCHANGED',
          content: currentLines[i],
          oldLineNumber: i + 1,
          newLineNumber: i + 1,
        });
      }

      return {
        summary: {
          status: 'UNCHANGED',
          additions: 0,
          deletions: 0,
          unchanged: currentLines.length,
          totalChanges: 0,
          isNoOp: true,
          truncated: currentLines.length > this.MAX_DIFF_LINES,
          renderedHash,
          currentHash,
        },
        lines,
      };
    }

    // Case 3: Changed Content (Calculate LCS-based Line Diff)
    const oldLines = normalizedCurrent.split('\n');
    const newLines = normalizedNew.split('\n');

    const diffLines = this.computeLcsDiff(oldLines, newLines);

    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const dl of diffLines) {
      if (dl.type === 'ADDED') additions++;
      else if (dl.type === 'REMOVED') deletions++;
      else if (dl.type === 'UNCHANGED') unchanged++;
    }

    const isNoOp = additions === 0 && deletions === 0;
    const truncated = diffLines.length > this.MAX_DIFF_LINES;
    const boundedLines = truncated
      ? [
          ...diffLines.slice(0, this.MAX_DIFF_LINES),
          {
            type: 'HEADER' as DiffLineType,
            content: `... Diff preview truncated (${diffLines.length - this.MAX_DIFF_LINES} more lines omitted) ...`,
          },
        ]
      : diffLines;

    return {
      summary: {
        status: isNoOp ? 'UNCHANGED' : 'CHANGED',
        additions,
        deletions,
        unchanged,
        totalChanges: additions + deletions,
        isNoOp,
        truncated,
        renderedHash,
        currentHash,
      },
      lines: boundedLines,
    };
  }

  /**
   * Classic LCS matrix algorithm with memory optimizations for text diffing
   */
  private computeLcsDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const n = oldLines.length;
    const m = newLines.length;

    // For very large documents (> 2500 lines on both sides), fallback to fast prefix/suffix diff
    if (n * m > 25000000) {
      return this.computeFastDiff(oldLines, newLines);
    }

    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.push({
          type: 'UNCHANGED',
          content: oldLines[i - 1],
          oldLineNumber: i,
          newLineNumber: j,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({
          type: 'ADDED',
          content: newLines[j - 1],
          newLineNumber: j,
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.push({
          type: 'REMOVED',
          content: oldLines[i - 1],
          oldLineNumber: i,
        });
        i--;
      }
    }

    return result.reverse();
  }

  /**
   * Fast line diff algorithm for extremely large files
   */
  private computeFastDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const result: DiffLine[] = [];
    let commonPrefix = 0;
    while (
      commonPrefix < oldLines.length &&
      commonPrefix < newLines.length &&
      oldLines[commonPrefix] === newLines[commonPrefix]
    ) {
      result.push({
        type: 'UNCHANGED',
        content: oldLines[commonPrefix],
        oldLineNumber: commonPrefix + 1,
        newLineNumber: commonPrefix + 1,
      });
      commonPrefix++;
    }

    let commonSuffix = 0;
    while (
      commonSuffix < oldLines.length - commonPrefix &&
      commonSuffix < newLines.length - commonPrefix &&
      oldLines[oldLines.length - 1 - commonSuffix] === newLines[newLines.length - 1 - commonSuffix]
    ) {
      commonSuffix++;
    }

    // Removals in the middle
    for (let i = commonPrefix; i < oldLines.length - commonSuffix; i++) {
      result.push({
        type: 'REMOVED',
        content: oldLines[i],
        oldLineNumber: i + 1,
      });
    }

    // Additions in the middle
    for (let j = commonPrefix; j < newLines.length - commonSuffix; j++) {
      result.push({
        type: 'ADDED',
        content: newLines[j],
        newLineNumber: j + 1,
      });
    }

    // Common suffix
    for (let k = oldLines.length - commonSuffix; k < oldLines.length; k++) {
      const newLineIdx = newLines.length - oldLines.length + k;
      result.push({
        type: 'UNCHANGED',
        content: oldLines[k],
        oldLineNumber: k + 1,
        newLineNumber: newLineIdx + 1,
      });
    }

    return result;
  }
}
