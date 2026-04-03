/**
 * CenterPanel -- Dark panel interior for the 9-slice frame center cell.
 *
 * Applies a grunge texture filter over a near-opaque dark background,
 * with an inset shadow to give depth. Children are rendered in a padded
 * container above the shadow layer.
 */

import type { ComponentChildren } from 'preact';
import { COLORS } from '@/ui/design-tokens';

export interface CenterPanelProps {
  children: ComponentChildren;
}

export function CenterPanel({ children }: CenterPanelProps) {
  return (
    <div
      class="relative w-full h-full overflow-hidden flex items-center justify-center bg-repeat bg-center"
      style={{
        backgroundColor: COLORS.bgPanel,
        filter: 'url(#grunge-heavy)',
      }}
    >
      {/* Inset shadow overlay */}
      <div
        class="absolute inset-0 pointer-events-none z-0"
        style={{ boxShadow: 'inset 0 0 40px rgba(15,20,10,1)' }}
      />
      {/* Content */}
      <div class="relative z-10 w-full h-full p-4">{children}</div>
    </div>
  );
}
