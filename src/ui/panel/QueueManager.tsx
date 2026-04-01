/** QueueManager -- Displays training queue items with cancel buttons. */

export interface QueueManagerProps {
  /** Queue item names (e.g. ['Brawler', 'Sniper']). Index 0 is currently training. */
  queueItems: string[];
  /** Progress percentage for the first item (0-100). */
  progress: number;
  /** Called with the queue index to cancel that item. */
  onCancel: (queueIndex: number) => void;
}

const CANCEL_BTN_STYLE = {
  color: 'var(--pw-enemy-light)',
  background: 'none',
  border: 'none',
  padding: '0 2px',
  lineHeight: 1,
} as const;

function QueueItem({
  name,
  index,
  isActive,
  progress,
  onCancel,
}: {
  name: string;
  index: number;
  isActive: boolean;
  progress: number;
  onCancel: (idx: number) => void;
}) {
  return (
    <div class="flex items-center justify-between gap-1" data-testid="queue-item">
      <span
        class="text-[9px] truncate"
        style={{ color: isActive ? 'var(--pw-accent)' : 'var(--pw-text-muted)' }}
      >
        {isActive ? `Training: ${name} (${Math.round(progress)}%)` : name}
      </span>
      <button
        type="button"
        class="text-[9px] font-bold cursor-pointer flex-shrink-0 min-w-[16px] min-h-[20px]"
        style={CANCEL_BTN_STYLE}
        data-testid="queue-cancel-btn"
        onClick={(e) => {
          e.stopPropagation();
          onCancel(index);
        }}
        aria-label={`Cancel ${name}`}
      >
        X
      </button>
    </div>
  );
}

export function QueueManager({ queueItems, progress, onCancel }: QueueManagerProps) {
  if (queueItems.length === 0) return null;

  return (
    <div class="mt-1.5 flex flex-col gap-0.5" data-testid="queue-manager">
      {queueItems.map((item, idx) => (
        <QueueItem
          key={`${item}-${idx}`}
          name={item}
          index={idx}
          isActive={idx === 0 && progress > 0}
          progress={progress}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
