// @vitest-environment jsdom

import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { SettingsPanel } from '@/ui/settings-panel';

describe('SettingsPanel', () => {
  it('shows the build stamp for release verification', () => {
    const view = render(
      <SettingsPanel
        onMasterVolumeChange={vi.fn()}
        onMusicVolumeChange={vi.fn()}
        onSfxVolumeChange={vi.fn()}
        onSpeedSet={vi.fn()}
        onColorBlindToggle={vi.fn()}
        onAutoSaveToggle={vi.fn()}
        onUiScaleChange={vi.fn()}
        onScreenShakeToggle={vi.fn()}
        onReduceVisualNoiseToggle={vi.fn()}
        onAutoPlayToggle={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(view.getByText(BUILD_STAMP_LABEL)).toBeTruthy();
  });
});
