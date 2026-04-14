// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { RankUpModal } from '@/ui/screens/RankUpModal';

describe('RankUpModal', () => {
  const baseProps = {
    prestigeState: { rank: 1, pearls: 12, totalPearlsEarned: 20, upgradeRanks: {} },
    progressionLevel: 30,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('shows the build stamp for prestige-flow support captures', () => {
    const view = render(<RankUpModal {...baseProps} />);

    expect(view.getByText(`Build ${BUILD_STAMP_LABEL}`)).toBeTruthy();
  }, 15_000);

  it('renders the current rank, next rank, and pearl reward', () => {
    const view = render(<RankUpModal {...baseProps} />);

    expect(view.getByText('RANK UP')).toBeTruthy();
    expect(view.getByText('Rank 1')).toBeTruthy();
    expect(view.getByText('Rank 2')).toBeTruthy();
    expect(view.getByText('Pearls Earned')).toBeTruthy();
    expect(view.getByText('+16')).toBeTruthy();
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = vi.fn();
    const view = render(<RankUpModal {...baseProps} onCancel={onCancel} />);

    fireEvent.click(view.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('calls onConfirm with the prestige result when Confirm is pressed', () => {
    const onConfirm = vi.fn();
    const view = render(<RankUpModal {...baseProps} onConfirm={onConfirm} />);

    fireEvent.click(view.getByRole('button', { name: 'Confirm rank up to rank 2' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      newRank: 2,
      pearlsEarned: 16,
      newPearlBalance: 28,
    });
    expect(onConfirm.mock.calls[0][1]).toMatchObject({
      rank: 2,
      pearls: 28,
      totalPearlsEarned: 36,
    });
  });

  it('disables confirm and shows the threshold warning when not eligible', () => {
    const view = render(<RankUpModal {...baseProps} progressionLevel={25} />);
    const confirm = view.getByRole('button', { name: 'Confirm rank up to rank 2' }) as HTMLButtonElement;

    expect(confirm.disabled).toBe(true);
    expect(view.getByText('Need progression level 30 (current: 25)')).toBeTruthy();
  });
});
