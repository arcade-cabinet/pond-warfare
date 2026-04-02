/**
 * AdvisorToast -- HUD toast for advisor tips.
 *
 * Positioned bottom-left, above safe area, responsive via screenClass.
 * Shows advisor persona icon, name, message, and dismiss controls.
 * Slides up on entrance with the existing panel-fade-in animation.
 */

import {
  currentAdvisorTip,
  dismissCurrentTip,
  permanentlyDismissTip,
} from '@/advisors/advisor-system';
import { executeAdvisorAction } from '@/advisors/tip-actions';
import { ADVISOR_PERSONAS } from '@/config/advisor-config';
import { canDockPanels, screenClass } from '@/platform';

/** Toast container positioning based on layout signals. */
function getContainerStyle(): Record<string, string> {
  const isCompact = screenClass.value === 'compact';
  const docked = canDockPanels.value;

  return {
    position: 'fixed',
    bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    left: docked
      ? 'calc(12px + env(safe-area-inset-left, 0px))'
      : 'calc(8px + env(safe-area-inset-left, 0px))',
    maxWidth: isCompact ? '300px' : '400px',
    width: isCompact ? 'calc(100vw - 24px)' : 'auto',
    minWidth: isCompact ? '0' : '320px',
    zIndex: '30',
  };
}

export function AdvisorToast() {
  const tip = currentAdvisorTip.value;
  if (!tip) return null;

  const persona = ADVISOR_PERSONAS[tip.advisor];
  const isCompact = screenClass.value === 'compact';

  return (
    <div class="advisor-toast" style={getContainerStyle()} role="status" aria-live="polite">
      {/* Colored accent border */}
      <div
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '3px',
          background: persona.color,
          borderRadius: '4px 0 0 4px',
        }}
      />

      {/* Header: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div
          class="advisor-icon"
          style={{
            background: persona.color,
            width: isCompact ? '24px' : '28px',
            height: isCompact ? '24px' : '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isCompact ? '12px' : '14px',
            fontWeight: '700',
            color: 'var(--pw-advisor-text)',
            flexShrink: '0',
          }}
        >
          {persona.initial}
        </div>
        <span
          class="font-heading"
          style={{ color: persona.color, fontSize: isCompact ? '11px' : '12px' }}
        >
          {persona.name}
        </span>
      </div>

      {/* Message body -- tappable when tip has an action */}
      <p
        class={tip.action ? 'advisor-action-link' : undefined}
        style={{
          margin: '0 0 8px 0',
          fontSize: isCompact ? '12px' : '13px',
          lineHeight: '1.4',
          color: 'var(--pw-text-primary)',
          cursor: tip.action ? 'pointer' : 'default',
          textDecoration: tip.action ? 'underline' : 'none',
          textDecorationColor: tip.action ? 'var(--pw-text-muted)' : undefined,
          textUnderlineOffset: '3px',
        }}
        onClick={tip.action ? () => executeAdvisorAction(tip.action as string) : undefined}
        role={tip.action ? 'button' : undefined}
        tabIndex={tip.action ? 0 : undefined}
        onKeyDown={
          tip.action
            ? (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  executeAdvisorAction(tip.action as string);
                }
              }
            : undefined
        }
      >
        {tip.message}
        {tip.action && (
          <span aria-hidden="true" style={{ marginLeft: '4px' }}>
            →
          </span>
        )}
      </p>

      {/* Actions row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
        <button
          class="action-btn"
          style={{
            padding: isCompact ? '4px 10px' : '4px 12px',
            fontSize: isCompact ? '11px' : '12px',
            borderRadius: '4px',
          }}
          onClick={dismissCurrentTip}
          type="button"
        >
          Got it
        </button>
        <button
          class="advisor-dismiss-btn"
          style={{
            background: 'transparent',
            border: '1px solid var(--pw-border)',
            color: 'var(--pw-text-muted)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            lineHeight: '1',
          }}
          onClick={permanentlyDismissTip}
          title="Don't show again"
          aria-label="Don't show this tip again"
          type="button"
        >
          X
        </button>
      </div>
    </div>
  );
}
