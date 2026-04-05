/**
 * ConfirmChoicesOverlay -- Inline confirmation before closing upgrade screens.
 *
 * Shows a summary of purchases made during this session and offers
 * "Go Back" or "Confirm" actions. Used by both PearlUpgradeScreen
 * and UpgradeWebScreen.
 */

import { Frame9Slice } from '@/ui/components/frame';
import { COLORS } from '@/ui/design-tokens';

export interface ConfirmChoicesOverlayProps {
  purchases: string[];
  onConfirm: () => void;
  onGoBack: () => void;
}

export function ConfirmChoicesOverlay({
  purchases,
  onConfirm,
  onGoBack,
}: ConfirmChoicesOverlayProps) {
  return (
    <div
      class="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      data-testid="confirm-choices-overlay"
    >
      <div style={{ maxWidth: '360px', width: '90%' }}>
        <Frame9Slice title="Apply these upgrades?">
          <div class="px-3 py-3 flex flex-col gap-3">
            {/* Purchase summary */}
            <div class="flex flex-col gap-1" style={{ maxHeight: '200px', overflow: 'auto' }}>
              {purchases.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  class="flex items-center gap-2 font-game text-xs"
                  style={{ color: COLORS.sepiaText }}
                >
                  <span style={{ color: COLORS.mossGreen }}>+</span>
                  {name}
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div class="flex gap-2">
              <button
                type="button"
                class="rts-btn flex-1 py-2 font-heading text-sm uppercase"
                style={{
                  minHeight: '44px',
                  color: COLORS.weatheredSteel,
                  borderColor: COLORS.weatheredSteel,
                }}
                onClick={onGoBack}
              >
                Go Back
              </button>
              <button
                type="button"
                class="rts-btn flex-1 py-2 font-heading text-sm uppercase"
                style={{
                  minHeight: '44px',
                  color: COLORS.grittyGold,
                  borderColor: COLORS.grittyGold,
                }}
                onClick={onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
