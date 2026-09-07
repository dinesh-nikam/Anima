import React, { useState } from 'react';
import type { DraftValidationError } from '../../types/readme';
import { ConsoleBadge } from '../ui/primitives';

interface ValidationBannerProps {
  errors: DraftValidationError[];
  onSelectSection?: (sectionId: string) => void;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  errors,
  onSelectSection,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-alert-500/10 border-b border-alert-500/30 px-6 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-alert-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-mono text-xs font-bold uppercase tracking-wide text-alert-400">
            Validation Notice: {errors.length} issue{errors.length === 1 ? '' : 's'} found
          </span>
          <ConsoleBadge tone="hazard">{errors.length} issues</ConsoleBadge>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="font-mono text-xs font-bold uppercase tracking-wide text-alert-400 hover:text-alert-300 underline cursor-pointer"
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {isExpanded && (
        <ul className="mt-3 space-y-1.5 font-mono text-xs text-alert-400/90 pl-6 list-disc border-t border-alert-500/20 pt-2">
          {errors.map((err, i) => (
            <li key={i} className="leading-relaxed">
              {err.componentKey && (
                <span className="font-bold text-alert-300">[{err.componentKey}] </span>
              )}
              {err.reason}
              {err.sectionId && onSelectSection && (
                <button
                  type="button"
                  onClick={() => onSelectSection(err.sectionId!)}
                  className="ml-2 text-signal-400 hover:text-signal-300 underline cursor-pointer"
                >
                  (Go to section)
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
