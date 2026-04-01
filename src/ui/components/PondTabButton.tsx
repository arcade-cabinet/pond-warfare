/**
 * PondTabButton -- Tab button using the painted Button.png asset.
 * Smaller variant of MenuButton, sized for tab bars.
 */

const UI = '/pond-warfare/assets/ui';

interface PondTabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function PondTabButton({ label, active, onClick }: PondTabButtonProps) {
  return (
    <button
      type="button"
      class="pond-tab-btn relative flex items-center justify-center cursor-pointer"
      onClick={onClick}
      style={{
        opacity: active ? 1 : 0.6,
        transform: active ? 'scale(1.05)' : 'scale(0.95)',
      }}
    >
      <img
        src={`${UI}/Button.png`}
        alt=""
        class="absolute inset-0 w-full h-full object-fill pointer-events-none"
        draggable={false}
      />
      <span
        class="relative z-10 font-heading font-bold tracking-wider uppercase text-[10px]"
        style={{ color: active ? '#1a3a3a' : '#3a5a5a' }}
      >
        {label}
      </span>
    </button>
  );
}
