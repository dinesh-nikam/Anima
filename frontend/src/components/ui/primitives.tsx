import React from 'react';

/* ==========================================================================
   ANIMA UI PRIMITIVES — "Signal Feed" design system
   Small, composable, accessible building blocks shared across pages.
   Every component is a thin wrapper around the token classes in index.css.
   ========================================================================== */

type ClassName = string | false | null | undefined;

function cx(...parts: ClassName[]) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* SignalHeader — the branded console strip. Sits at the top of every
   surface. Left: brand block. Right: action cluster. Middle: live
   telemetry readout (the memorable "SIG ▮ ANIMA" console line).        */
/* ------------------------------------------------------------------ */
interface SignalHeaderProps {
  brandMark: string; // short monospace brand token, e.g. "ANIMA"
  brandLabel: string; // human label, e.g. "Visual Console"
  live?: string; // live telemetry string, e.g. "PHASE 7 · V2.8"
  right?: React.ReactNode;
}

export const SignalHeader: React.FC<SignalHeaderProps> = ({
  brandMark,
  brandLabel,
  live,
  right,
}) => {
  return (
    <header className="signal-header sticky top-0 z-20 h-14 px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 bg-signal-500 text-carbon-950 grid place-items-center font-mono font-black text-xs tracking-tight">
          {brandMark.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-sm tracking-tight text-console-100 truncate">
              {brandLabel}
            </h1>
            <span className="console-badge console-badge-accent hidden sm:inline-flex">
              SIG ▮ LIVE
            </span>
          </div>
          {live && (
            <p className="tick-label truncate">{live}</p>
          )}
        </div>
      </div>
      {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
    </header>
  );
};

/* ------------------------------------------------------------------ */
/* CornerTicks — the memorable anchor: 10px signal ticks framing a
   hero/prominent surface. (Visual only; the parent owns semantics.)   */
/* ------------------------------------------------------------------ */
type CornerTicksProps = React.HTMLAttributes<HTMLDivElement>;

export const CornerTicks: React.FC<CornerTicksProps> = ({
  className,
  children,
  ...rest
}) => {
  return (
    <div className={cx('corner-ticks', className)} {...rest}>
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* InstrumentPanel — sharp, hairline-bordered console surface.         */
/* ------------------------------------------------------------------ */
interface InstrumentPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  className,
  hover,
  children,
  ...rest
}) => {
  return (
    <div
      className={cx(hover ? 'instrument-panel-hover' : 'instrument-panel', className)}
      {...rest}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ConsoleButton — primary (signal block) or secondary (hairline).     */
/* ------------------------------------------------------------------ */
interface ConsoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const ConsoleButton: React.FC<ConsoleButtonProps> = ({
  variant = 'primary',
  className,
  type = 'button',
  children,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={cx(
        variant === 'primary' ? 'console-btn-primary' : 'console-btn-secondary',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* ConsoleIconButton — icon-only hairline console button.              */
/* ------------------------------------------------------------------ */
interface ConsoleIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
}

export const ConsoleIconButton: React.FC<ConsoleIconButtonProps> = ({
  danger,
  className,
  type = 'button',
  children,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={cx(
        'console-icon-btn',
        danger && 'is-danger',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* ConsoleBadge — mono micro-tag. accent | hazard | default.           */
/* ------------------------------------------------------------------ */
interface ConsoleBadgeProps {
  tone?: 'default' | 'accent' | 'hazard';
  className?: string;
  children: React.ReactNode;
}

export const ConsoleBadge: React.FC<ConsoleBadgeProps> = ({
  tone = 'default',
  className,
  children,
}) => {
  return (
    <span
      className={cx(
        'console-badge',
        tone === 'accent' && 'console-badge-accent',
        tone === 'hazard' && 'console-badge-hazard',
        className,
      )}
    >
      {children}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* TickLabel — the mono micro-readout above sections.                  */
/* ------------------------------------------------------------------ */
interface TickLabelProps {
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const TickLabel: React.FC<TickLabelProps> = ({
  accent,
  className,
  children,
}) => {
  return (
    <p className={cx(accent ? 'tick-label-accent' : 'tick-label', className)}>
      {children}
    </p>
  );
};

/* ------------------------------------------------------------------ */
/* TickDivider — asymmetric console rule between sections.             */
/* ------------------------------------------------------------------ */
export const TickDivider: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cx('tick-divider', className)} aria-hidden="true" />;
};

/* ------------------------------------------------------------------ */
/* ModalShell — accessible modal frame with the console language.      */
/* ------------------------------------------------------------------ */
interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = 'max-w-lg',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-carbon-950/80 backdrop-blur-sm grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cx('corner-ticks w-full', maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="instrument-panel w-full bg-carbon-900">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-console-700">
            <div className="min-w-0">
              {eyebrow && <TickLabel accent>{eyebrow}</TickLabel>}
              <h3 className="font-display font-bold text-base text-console-100 tracking-tight mt-0.5">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="console-icon-btn"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Spinner — the console loading readout (no decorative rings).        */
/* ------------------------------------------------------------------ */
export const ConsoleSpinner: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-[2px] bg-signal-500 animate-pulse" aria-hidden="true" />
      <TickLabel>SYNCING…</TickLabel>
      {label && <p className="font-mono text-xs text-console-300">{label}</p>}
    </div>
  );
};