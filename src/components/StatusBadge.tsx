import { PROCESSING_STATUSES } from '@/lib/constants';
import type { ProcessingStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ProcessingStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = PROCESSING_STATUSES[status] ?? PROCESSING_STATUSES.recorded;
  const isProcessing = ['transcribing', 'transcribed', 'mood_processed', 'cleaning', 'cleaned', 'sending_to_hindsight'].includes(status);

  return (
    <div className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${isProcessing ? 'animate-pulse' : ''}`} />
      <span className={config.color}>{config.label}</span>
    </div>
  );
}
