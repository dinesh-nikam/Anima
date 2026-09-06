import type { AvailabilityStatus } from '../../types/readme';

export interface StatusBadgeProps {
  status: AvailabilityStatus;
  label?: string;
}

const COLOR: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  STALE: 'bg-yellow-100 text-yellow-800',
  UNAVAILABLE: 'bg-zinc-100 text-zinc-700',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COLOR[status]}`}
    >
      {label ?? status}
    </span>
  );
}
