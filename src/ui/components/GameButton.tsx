/**
 * GameButton -- Unified button component with four variants.
 *
 * Replaces ad-hoc action-btn / menu-btn buttons across the UI.
 * All variants meet 44px minimum touch target and are keyboard-accessible.
 */

const UI = '/pond-warfare/assets/ui';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface GameButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  hotkey?: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  title?: string;
  testId?: string;
}

const SIZE_MAP = {
  sm: { minH: '36px', minW: '36px', fontSize: '10px', px: 'px-2', py: 'py-1' },
  md: { minH: '44px', minW: '44px', fontSize: '11px', px: 'px-3', py: 'py-2' },
  lg: { minH: '48px', minW: '48px', fontSize: '14px', px: 'px-4', py: 'py-2' },
} as const;

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    color: string;
    borderColor: string;
    bg: string;
    hoverBg: string;
  }
> = {
  primary: {
    color: 'var(--pw-btn-dark-text, #1a3a44)',
    borderColor: 'transparent',
    bg: 'transparent',
    hoverBg: 'transparent',
  },
  secondary: {
    color: 'var(--pw-text-primary)',
    borderColor: 'var(--pw-border-accent)',
    bg: 'rgba(26, 58, 68, 0.85)',
    hoverBg: 'rgba(64, 200, 208, 0.12)',
  },
  danger: {
    color: 'var(--pw-enemy-light)',
    borderColor: 'var(--pw-enemy)',
    bg: 'rgba(68, 26, 26, 0.85)',
    hoverBg: 'rgba(224, 96, 96, 0.15)',
  },
  ghost: {
    color: 'var(--pw-text-secondary)',
    borderColor: 'transparent',
    bg: 'transparent',
    hoverBg: 'rgba(64, 200, 208, 0.08)',
  },
};

export function GameButton({
  label,
  onClick,
  variant = 'secondary',
  disabled = false,
  hotkey,
  size = 'md',
  class: extraClass,
  title,
  testId,
}: GameButtonProps) {
  const s = SIZE_MAP[size];
  const v = VARIANT_STYLES[variant];
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      class={`game-btn relative flex items-center justify-center font-heading font-bold tracking-wider rounded-lg cursor-pointer transition-all ${s.px} ${s.py} ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${extraClass ?? ''}`}
      style={{
        minHeight: s.minH,
        minWidth: s.minW,
        fontSize: s.fontSize,
        color: isPrimary ? v.color : v.color,
        border: isPrimary ? 'none' : `1px solid ${v.borderColor}`,
        background: isPrimary ? 'none' : v.bg,
        backdropFilter: variant === 'ghost' ? 'none' : 'blur(4px)',
      }}
      disabled={disabled}
      title={title ?? (hotkey ? `${label} (${hotkey.toUpperCase()})` : label)}
      data-testid={testId}
      onClick={
        disabled
          ? undefined
          : (e) => {
              e.stopPropagation();
              onClick();
            }
      }
    >
      {/* Primary variant: Button.png background */}
      {isPrimary && (
        <img
          src={`${UI}/Button.png`}
          alt=""
          class="absolute inset-0 w-full h-full object-fill pointer-events-none"
          draggable={false}
          style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
        />
      )}
      {/* Hotkey badge */}
      {hotkey && (
        <span
          class="absolute top-1 right-1 font-numbers text-[8px] px-1 rounded"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'var(--pw-text-muted)',
            lineHeight: '1.3',
          }}
        >
          {hotkey.toUpperCase()}
        </span>
      )}
      <span
        class={`relative z-10 ${isPrimary ? 'uppercase' : ''}`}
        style={isPrimary ? { textShadow: '0 1px 1px rgba(180,220,220,0.4)' } : undefined}
      >
        {label}
      </span>
    </button>
  );
}
