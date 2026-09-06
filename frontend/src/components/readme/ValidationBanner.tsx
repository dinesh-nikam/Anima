import React, { useState } from 'react';
import type { DraftValidationError } from '../../types/readme';

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
    <div className="bg-rose-950/80 border-b border-rose-500/40 text-rose-200 px-6 py-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-semibold">
            Validation Notice: {errors.length} issue{errors.length === 1 ? '' : 's'} found in this README draft.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-rose-300 hover:text-white underline cursor-pointer"
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {isExpanded && (
        <ul className="mt-3 space-y-1.5 text-xs text-rose-300/90 pl-6 list-disc border-t border-rose-900/60 pt-2">
          {errors.map((err, i) => (
            <li key={i} className="leading-relaxed">
              {err.componentKey && (
                <span className="font-mono font-bold text-rose-200">[{err.componentKey}] </span>
              )}
              {err.reason}
              {err.sectionId && onSelectSection && (
                <button
                  type="button"
                  onClick={() => onSelectSection(err.sectionId!)}
                  className="ml-2 text-indigo-300 hover:underline cursor-pointer"
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
