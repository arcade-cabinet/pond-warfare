/** Compact auto-behavior toggle button. */

export interface AutoToggleProps {
  label: string;
  enabled: boolean;
  color: string;
  onToggle: () => void;
}

export function AutoToggle({ label, enabled, color, onToggle }: AutoToggleProps) {
  return (
    <button
      type="button"
      class="px-1.5 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors min-h-[36px]"
      style={{
        border: `1px solid ${color}`,
        color,
        background: enabled ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {enabled ? '\u2713 ' : ''}
      {label}
    </button>
  );
}
