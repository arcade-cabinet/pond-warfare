/**
 * AdvisorToast Tests
 *
 * Validates the advisor toast renders tip content, persona styling,
 * dismiss buttons, and actionable tip links.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdvisorTip } from '@/advisors/types';

const { mockDismiss, mockPermanentDismiss, mockExecuteAction } = vi.hoisted(() => ({
  mockDismiss: vi.fn(),
  mockPermanentDismiss: vi.fn(),
  mockExecuteAction: vi.fn(),
}));

vi.mock('@/advisors/advisor-system', async () => {
  const { signal } = await import('@preact/signals');
  return {
    currentAdvisorTip: signal<AdvisorTip | null>(null),
    dismissCurrentTip: (...args: unknown[]) => mockDismiss(...args),
    permanentlyDismissTip: (...args: unknown[]) => mockPermanentDismiss(...args),
  };
});

vi.mock('@/advisors/tip-actions', () => ({
  executeAdvisorAction: (...args: unknown[]) => mockExecuteAction(...args),
}));

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import { currentAdvisorTip } from '@/advisors/advisor-system';
import { AdvisorToast } from '@/ui/hud/AdvisorToast';

const SAMPLE_TIP: AdvisorTip = {
  id: 'test-idle-gatherers',
  advisor: 'economy',
  condition: () => true,
  cooldown: 1800,
  priority: 80,
  message: 'You have 3 idle gatherers.',
};

const ACTIONABLE_TIP: AdvisorTip = {
  id: 'test-open-forces',
  advisor: 'economy',
  condition: () => true,
  cooldown: 1800,
  priority: 80,
  message: 'Open Forces to manage idle gatherers.',
  action: 'open-forces',
};

beforeEach(() => {
  currentAdvisorTip.value = null;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AdvisorToast', () => {
  it('renders nothing when no tip is active', () => {
    render(h(AdvisorToast, {}));
    expect(document.querySelector('.advisor-toast')).toBeNull();
  });

  it('renders advisor name and message when tip is set', () => {
    currentAdvisorTip.value = SAMPLE_TIP;
    render(h(AdvisorToast, {}));
    const toast = document.querySelector('.advisor-toast');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('Elder Whiskers');
    expect(toast?.textContent).toContain('You have 3 idle gatherers.');
  });

  it('renders persona color on icon and name', () => {
    currentAdvisorTip.value = SAMPLE_TIP;
    render(h(AdvisorToast, {}));
    const icon = document.querySelector('.advisor-icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.style.background).toBe('rgb(251, 191, 36)');
    expect(icon.textContent).toBe('E');
  });

  it('"Got it" button calls dismissCurrentTip', () => {
    currentAdvisorTip.value = SAMPLE_TIP;
    render(h(AdvisorToast, {}));
    const gotItBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Got it',
    );
    expect(gotItBtn).toBeTruthy();
    gotItBtn?.click();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('"X" button calls permanentlyDismissTip', () => {
    currentAdvisorTip.value = SAMPLE_TIP;
    render(h(AdvisorToast, {}));
    const xBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'X',
    );
    expect(xBtn).toBeTruthy();
    expect(xBtn?.title).toBe("Don't show again");
    xBtn?.click();
    expect(mockPermanentDismiss).toHaveBeenCalledTimes(1);
  });

  // --- Action link tests ---

  it('renders arrow indicator and action-link class when tip has action', () => {
    currentAdvisorTip.value = ACTIONABLE_TIP;
    render(h(AdvisorToast, {}));
    const link = document.querySelector('.advisor-action-link') as HTMLElement;
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('\u2192');
    expect(link.style.cursor).toBe('pointer');
    expect(link.style.textDecoration).toBe('underline');
  });

  it('does not render action-link class when tip has no action', () => {
    currentAdvisorTip.value = SAMPLE_TIP;
    render(h(AdvisorToast, {}));
    expect(document.querySelector('.advisor-action-link')).toBeNull();
  });

  it('clicking action link calls executeAdvisorAction with correct action', () => {
    currentAdvisorTip.value = ACTIONABLE_TIP;
    render(h(AdvisorToast, {}));
    const link = document.querySelector('.advisor-action-link') as HTMLElement;
    link.click();
    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteAction).toHaveBeenCalledWith('open-forces');
  });

  it('action link has role=button and tabIndex for accessibility', () => {
    currentAdvisorTip.value = ACTIONABLE_TIP;
    render(h(AdvisorToast, {}));
    const link = document.querySelector('.advisor-action-link') as HTMLElement;
    expect(link.getAttribute('role')).toBe('button');
    expect(link.tabIndex).toBe(0);
  });
});
