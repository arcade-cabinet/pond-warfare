/**
 * AutoToggleButton - A single auto-behavior toggle button for the idle menu.
 */

export function AutoToggleButton({
  label,
  enabled,
  onToggle,
  color,
  activeBackground,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  activeBackground: string;
}) {
  return (
    <button
      type="button"
      class="cmd-btn border px-2 py-0.5 min-h-[32px] min-w-[32px] md:min-h-[36px] md:min-w-[36px] rounded-full font-bold text-[10px] md:text-sm flex items-center gap-1 md:gap-1.5 transition-colors shadow cursor-pointer"
      style={{
        borderColor: color,
        color,
        background: enabled ? activeBackground : undefined,
      }}
      title={`Auto-${label}: ${enabled ? 'ON' : 'OFF'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span
        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          border: `1px solid ${color}`,
          background: enabled ? color : 'transparent',
        }}
      />
      <span class="font-heading">{label}</span>
    </button>
  );
}
