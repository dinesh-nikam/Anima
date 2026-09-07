import type { AvailabilityStatus } from '../../types/readme';
import { ConsoleBadge } from '../ui/primitives';

export interface StatusBadgeProps {
  status: AvailabilityStatus;
  label?: string;
}

const TONE: Record<AvailabilityStatus, 'default' | 'accent' | 'hazard'> = {
  AVAILABLE: 'accent',
  PARTIAL: 'hazard',
  STALE: 'hazard',
  UNAVAILABLE: 'default',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <ConsoleBadge tone={TONE[status]}>
      {label ?? status}
    </ConsoleBadge>
  );
}
