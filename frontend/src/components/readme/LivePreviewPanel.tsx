import React from 'react';
import type { PreviewResult } from '../../types/readme';

interface LivePreviewPanelProps {
  preview: PreviewResult | null;
  isLoading: boolean;
  themeId: string;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  preview,
  isLoading,
  themeId,
}) => {
  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-500">
        <svg className="w-8 h-8 animate-spin text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">Rendering preview...</p>
      </div>
    );
  }

  const { markdown, metadata, validation } = preview;

  const renderMarkdownContent = (rawMd: string) => {
    // Split by blocks and render HTML/Markdown structure
    const lines = rawMd.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = line.replace('```', '').trim();
          codeContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={`code-${i}`} className="bg-slate-950 text-slate-200 text-xs p-3 rounded-lg border border-slate-800 overflow-x-auto my-3 font-mono">
              <code className={codeLang ? `language-${codeLang}` : ''}>{codeContent.join('\n')}</code>
            </pre>
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-black text-white pb-2 border-b border-slate-800 my-3">
            {line.replace('# ', '')}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-bold text-white pb-1.5 border-b border-slate-800/80 my-3">
            {line.replace('## ', '')}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-slate-200 my-2">
            {line.replace('### ', '')}
          </h3>
        );
        continue;
      }

      // Horizontal Divider
      if (line.trim() === '---') {
        elements.push(<hr key={`hr-${i}`} className="border-slate-800 my-4" />);
        continue;
      }

      // Blockquote / Error Callout
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-4 border-indigo-500 pl-3 py-1 text-slate-300 italic text-xs my-2 bg-indigo-950/20 rounded-r">
            {line.replace('> ', '')}
          </blockquote>
        );
        continue;
      }

      // List Item
      if (line.startsWith('- ')) {
        elements.push(
          <li key={`li-${i}`} className="text-xs text-slate-300 ml-4 list-disc my-0.5">
            {renderInline(line.replace('- ', ''))}
          </li>
        );
        continue;
      }

      // Image or Badge or Normal Paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1.5">
          {renderInline(line)}
        </p>
      );
    }

    return elements;
  };

  const renderInline = (text: string) => {
    // Check for Image tag ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderFormatting(text.substring(lastIndex, match.index)));
      }
      const alt = match[1];
      const src = match[2];
      parts.push(
        <img
          key={`img-${match.index}`}
          src={src}
          alt={alt}
          className="inline-block max-w-full rounded my-1 shadow-sm"
          onError={(e) => {
            // Fallback for image load failure
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderFormatting(text.substring(lastIndex)));
    }

    return parts;
  };

  const renderFormatting = (text: string) => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Preview Meta Bar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Live Preview
          </span>

          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            Theme: {themeId}
          </span>

          <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
            metadata?.dataCompleteness === 'AVAILABLE'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            Data: {metadata?.dataCompleteness || 'AVAILABLE'}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs animate-pulse">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {validation && !validation.valid && validation.errors.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-300">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{validation.errors.length} validation issue(s) detected.</span>
        </div>
      )}

      {/* Rendered Preview Document Container */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-black/60 relative">
          {renderMarkdownContent(markdown)}
        </div>
      </div>
    </div>
  );
};
