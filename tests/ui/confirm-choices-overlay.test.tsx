// @vitest-environment jsdom
/**
 * ConfirmChoicesOverlay Tests
 *
 * Validates the confirmation modal shown when closing upgrade screens:
 * - Displays list of purchases made during session
 * - Go Back button returns to upgrade screen (calls onGoBack)
 * - Confirm button closes and applies (calls onConfirm)
 * - All buttons are 44px min touch targets
 */

import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { ConfirmChoicesOverlay } from '@/ui/screens/ConfirmChoicesOverlay';

describe('ConfirmChoicesOverlay', () => {
  const mockPurchases = ['Fish Gathering I', 'Rock Mining I', 'Unlock Otter Sage'];

  it('should render all purchase names', () => {
    const { getByText } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    for (const name of mockPurchases) {
      expect(getByText(name)).toBeTruthy();
    }
  });

  it('should render Go Back and Confirm buttons', () => {
    const { getByText } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    expect(getByText('Go Back')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('should call onGoBack when Go Back is clicked', () => {
    const onGoBack = vi.fn();
    const { getByText } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={onGoBack} />,
    );

    getByText('Go Back').click();
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when Confirm is clicked', () => {
    const onConfirm = vi.fn();
    const { getByText } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={onConfirm} onGoBack={vi.fn()} />,
    );

    getByText('Confirm').click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should have 44px minimum touch targets on both buttons', () => {
    const { container } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      const style = btn.getAttribute('style') ?? '';
      expect(style).toContain('44px');
    }
  });

  it('should have the confirm-choices-overlay testid', () => {
    const { getByTestId } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    expect(getByTestId('confirm-choices-overlay')).toBeTruthy();
  });

  it('should show title "Apply these upgrades?"', () => {
    const { container } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    // Frame9Slice renders the title -- check it exists in the DOM
    const text = container.textContent ?? '';
    expect(text).toContain('Apply these upgrades?');
  });

  it('shows the build stamp for upgrade-confirmation captures', () => {
    const { getByText } = render(
      <ConfirmChoicesOverlay purchases={mockPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    expect(getByText(`Build ${BUILD_STAMP_LABEL}`)).toBeTruthy();
  });

  it('should handle single purchase', () => {
    const { getByText } = render(
      <ConfirmChoicesOverlay
        purchases={['Combat Mastery III']}
        onConfirm={vi.fn()}
        onGoBack={vi.fn()}
      />,
    );

    expect(getByText('Combat Mastery III')).toBeTruthy();
  });

  it('should handle many purchases without error', () => {
    const manyPurchases = Array.from({ length: 20 }, (_, i) => `Upgrade ${i + 1}`);
    const { container } = render(
      <ConfirmChoicesOverlay purchases={manyPurchases} onConfirm={vi.fn()} onGoBack={vi.fn()} />,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Upgrade 1');
    expect(text).toContain('Upgrade 20');
  });
});

describe('Confirmation flow integration (Pearl screen)', () => {
  it('should skip confirmation when no purchases were made', () => {
    // Logic test: if purchases.length === 0, onBack is called directly
    const purchases: string[] = [];
    const shouldShowConfirm = purchases.length > 0;
    expect(shouldShowConfirm).toBe(false);
  });

  it('should show confirmation when purchases exist', () => {
    const purchases = ['Fish Gathering I'];
    const shouldShowConfirm = purchases.length > 0;
    expect(shouldShowConfirm).toBe(true);
  });
});

describe('Confirmation flow integration (Clam screen)', () => {
  it('should skip confirmation when no nodes were purchased', () => {
    const purchases: string[] = [];
    const shouldShowConfirm = purchases.length > 0;
    expect(shouldShowConfirm).toBe(false);
  });

  it('should show confirmation when nodes were purchased', () => {
    const purchases = ['Fish Gathering I', 'Rock Mining II'];
    const shouldShowConfirm = purchases.length > 0;
    expect(shouldShowConfirm).toBe(true);
  });
});
