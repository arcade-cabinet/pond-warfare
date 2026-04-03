/**
 * MenuButton — Wood plank warfare-styled button using the .rts-btn CSS class.
 */

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
  const disabledCls = disabled ? 'opacity-40 cursor-not-allowed grayscale' : '';

  return (
    <button
      type="button"
      class={`rts-btn font-heading flex items-center justify-center min-h-[44px] tracking-wider ${disabledCls}`}
      style={{
        width: wide ? '190px' : '150px',
        height: wide ? '50px' : '44px',
        fontSize: wide ? '1.1rem' : '0.85rem',
      }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </button>
  );
}
