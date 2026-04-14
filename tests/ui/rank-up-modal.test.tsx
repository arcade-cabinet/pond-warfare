// @vitest-environment jsdom

import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { RankUpModal } from '@/ui/screens/RankUpModal';

describe('RankUpModal', () => {
  it('shows the build stamp for prestige-flow support captures', () => {
    const view = render(
      <RankUpModal
        prestigeState={{ rank: 1, pearls: 12, totalPearlsEarned: 20, upgradeRanks: {} }}
        progressionLevel={15}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(view.getByText(`Build ${BUILD_STAMP_LABEL}`)).toBeTruthy();
  });
});
