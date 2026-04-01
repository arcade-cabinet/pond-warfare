/**
 * MenuButton — Teal bar button using the painted Button.png asset.
 */

const UI = '/pond-warfare/assets/ui';

export function MenuButton({
  label,
  onClick,
  disabled,
  wide,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      class={`menu-pond-btn relative flex items-center justify-center cursor-pointer min-h-[44px] transition-transform ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
      style={{ width: wide ? '170px' : '140px', height: wide ? '48px' : '42px' }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <img
        src={`${UI}/Button.png`}
        alt=""
        class="absolute inset-0 w-full h-full object-fill pointer-events-none"
        draggable={false}
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
      />
      <span
        class="relative z-10 font-heading font-bold tracking-wider uppercase"
        style={{
          color: '#1a3a3a',
          fontSize: wide ? '14px' : '11px',
          textShadow: '0 1px 1px rgba(180,220,220,0.4)',
        }}
      >
        {label}
      </span>
    </button>
  );
}
