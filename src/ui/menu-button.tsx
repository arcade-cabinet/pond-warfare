/**
 * MenuButton — Wood plank warfare-styled button using the .rts-btn CSS class.
 */

export function MenuButton({
  label,
  onClick,
  disabled,
  wide,
  extraClass,
  extraStyle,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  extraClass?: string;
  extraStyle?: Record<string, string | number>;
}) {
  const disabledCls = disabled ? 'opacity-40 cursor-not-allowed grayscale' : '';

  return (
    <button
      type="button"
      aria-label={label}
      class={`rts-btn font-heading flex items-center justify-center min-h-[44px] tracking-wider ${disabledCls} ${extraClass ?? ''}`}
      style={{
        width: wide ? '190px' : '150px',
        height: wide ? '50px' : '44px',
        fontSize: wide ? '1.1rem' : '0.85rem',
        ...extraStyle,
      }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </button>
  );
}
