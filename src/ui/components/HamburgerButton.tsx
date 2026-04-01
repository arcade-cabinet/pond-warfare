/** Floating hamburger button -- hidden when panels are docked. */

import { canDockPanels } from '@/platform';
import { togglePanel } from '../game-actions';

export function HamburgerButton() {
  if (canDockPanels.value) return null;

  return (
    <button
      type="button"
      class="absolute top-2 right-2 z-30 w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-lg font-bold cursor-pointer transition-opacity"
      style={{
        background: 'rgba(0,0,0,0.4)',
        color: 'var(--pw-accent)',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
      }}
      title="Command Panel"
      onClick={togglePanel}
    >
      {'\u2630'}
    </button>
  );
}
