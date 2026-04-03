/**
 * ActionToast — HUD toast for game action feedback notifications.
 *
 * Vine-frame card styling matching AchievementToast pattern, using
 * design bible tokens: var(--pw-mud) border, var(--pw-vine-base) accent.
 * Shows action icon, title, and description for 2.5 seconds.
 * Positioned bottom-center with slide-up entrance animation.
 */

import { useEffect, useState } from 'preact/hooks';
import { COLORS } from '@/ui/design-tokens';

export interface ActionToastData {
  id: string;
  icon: string;
  title: string;
  description?: string;
}

export interface ActionToastProps {
  toast: ActionToastData | null;
  onDismiss?: () => void;
}

const DISPLAY_MS = 2500;

export function ActionToast({ toast, onDismiss }: ActionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast || !visible) return null;

  return (
    <div
      class="action-toast"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        borderRadius: '8px',
        background: COLORS.bgPanel,
        border: `2px solid ${COLORS.woodBase}`,
        borderLeft: `4px solid ${COLORS.vineBase}`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 8px rgba(48,69,21,0.2)`,
        animation: 'action-toast-slide-up 0.3s ease-out',
        maxWidth: '360px',
        minWidth: '240px',
      }}
    >
      {/* Action icon */}
      <div
        style={{
          fontSize: '24px',
          lineHeight: 1,
          flexShrink: 0,
          filter: `drop-shadow(0 0 4px rgba(48,69,21,0.4))`,
        }}
      >
        {toast.icon}
      </div>

      {/* Text content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span
          class="font-heading"
          style={{
            color: COLORS.grittyGold,
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          {toast.title}
        </span>
        {toast.description && (
          <span
            class="font-game"
            style={{
              color: COLORS.weatheredSteel,
              fontSize: '11px',
              lineHeight: '1.3',
            }}
          >
            {toast.description}
          </span>
        )}
      </div>
    </div>
  );
}
