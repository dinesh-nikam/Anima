import React, { useState } from 'react';

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
    <div className="flex flex-col h-full bg-slate-950">
      {/* Meta Header */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Canonical Markdown
          </span>

          <span className="text-slate-600">|</span>

          <span>{lines.length} lines</span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        </button>
      </div>

      {/* Monospace Code Display */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-xs flex">
        {/* Line Numbers */}
        <div className="select-none pr-4 text-right text-slate-600 border-r border-slate-800/80 mr-4 font-mono">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <pre className="flex-1 text-slate-200 leading-6 overflow-x-auto whitespace-pre font-mono">
          <code>{markdown}</code>
        </pre>
      </div>
    </div>
  );
};
