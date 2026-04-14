// @vitest-environment jsdom

import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { KeyboardReference } from '@/ui/keyboard-reference';

describe('KeyboardReference', () => {
  it('shows the build stamp for shortcut-overlay captures', () => {
    const view = render(<KeyboardReference onClose={vi.fn()} />);

    expect(view.getByText(`Build ${BUILD_STAMP_LABEL}`)).toBeTruthy();
  });
});
