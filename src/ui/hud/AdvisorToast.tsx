/**
 * AdvisorToast -- Vine-framed briefing card for advisor tips.
 *
 * Positioned bottom-left, above safe area, responsive via screenClass.
 * Shows advisor persona icon with vine-border treatment, name, message,
 * and dismiss controls. Dark bark background with mud/vine accents.
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
      {/* Vine accent stripe */}
      <div class="advisor-toast-vine-stripe" style={{ background: persona.color }} />

      {/* Header: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div
          class="advisor-icon advisor-toast-icon"
          style={{
            background: persona.color,
            width: isCompact ? '26px' : '30px',
            height: isCompact ? '26px' : '30px',
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
          color: 'var(--pw-sepia-text)',
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
          }}
          onClick={dismissCurrentTip}
          type="button"
        >
          Got it
        </button>
        <button
          class="advisor-toast-dismiss"
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
