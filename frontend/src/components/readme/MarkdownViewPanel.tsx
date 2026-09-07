import React, { useState } from 'react';
import { ConsoleButton, ConsoleBadge } from '../ui/primitives';

interface MarkdownViewPanelProps {
  markdown: string;
  onCopy: () => void;
}

export const MarkdownViewPanel: React.FC<MarkdownViewPanelProps> = ({
  markdown,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = markdown.split('\n');
  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const charCount = markdown.length;

  return (
    <div className="flex flex-col h-full bg-carbon-950">
      {/* Meta Header — console chrome */}
      <div className="px-6 py-3 border-b border-console-700 bg-carbon-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="tick-label-accent flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            CANONICAL MARKDOWN
          </span>

          <span className="hidden sm:flex items-center gap-2">
            <ConsoleBadge>{lines.length} lines</ConsoleBadge>
            <ConsoleBadge>{wordCount} words</ConsoleBadge>
            <ConsoleBadge>{charCount} chars</ConsoleBadge>
          </span>
        </div>

        <ConsoleButton variant="primary" onClick={handleCopy}>
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Markdown</span>
            </>
          )}
        </ConsoleButton>
      </div>

      {/* Monospace Code Display — framed as instrument panel, not repainting artifact */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full flex font-mono text-xs instrument-panel overflow-hidden rounded-panel">
          {/* Line Numbers */}
          <div className="select-none pr-4 pl-3 py-6 text-right text-console-500 border-r border-console-700 bg-carbon-900 overflow-y-auto">
            {lines.map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Content */}
          <div className="flex-1 overflow-auto p-6">
            <pre className="text-console-200 leading-6 whitespace-pre">
              <code>{markdown}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
