/**
 * AchievementToast -- HUD toast for achievement earned notifications.
 *
 * Shows a trophy icon, achievement name, and description for 3 seconds.
 * Positioned top-center with slide-down entrance animation.
 */

import { activeAchievementToast } from '@/ui/store';

export function AchievementToast() {
  const toast = activeAchievementToast.value;
  if (!toast) return null;

  return (
    <div
      class="achievement-toast"
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '55',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(12, 26, 31, 0.95), rgba(30, 50, 55, 0.95))',
        border: '1px solid rgba(251, 191, 36, 0.4)',
        boxShadow: '0 4px 20px rgba(251, 191, 36, 0.15), 0 2px 8px rgba(0, 0, 0, 0.3)',
        animation: 'achievement-slide-in 0.4s ease-out',
        maxWidth: '400px',
        minWidth: '280px',
      }}
    >
      {/* Trophy icon */}
      <div
        style={{
          fontSize: '28px',
          lineHeight: '1',
          flexShrink: '0',
          filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))',
        }}
      >
        {'\uD83C\uDFC6'}
      </div>

      {/* Text content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
        <span
          class="font-heading"
          style={{
            color: 'var(--pw-clam, #fbbf24)',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}
        >
          {toast.name}
        </span>
        <span
          class="font-game"
          style={{
            color: 'var(--pw-text-secondary, #c0c0c0)',
            fontSize: '12px',
            lineHeight: '1.3',
          }}
        >
          {toast.desc}
        </span>
      </div>
    </div>
  );
}
