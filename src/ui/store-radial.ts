/**
 * Radial Menu Store (v3.0 — US9)
 *
 * Reactive signals for the contextual radial menu state.
 * Separated from store.ts to keep file sizes under 300 LOC.
 */

import { signal } from '@preact/signals';
import type { SpecialistZoneMode } from '@/game/specialist-assignment';
import type { RadialMenuMode } from './radial-menu-options';

/** Whether the radial menu is currently visible. */
export const radialMenuOpen = signal(false);

/** Screen X position of the radial menu center. */
export const radialMenuX = signal(0);

/** Screen Y position of the radial menu center. */
export const radialMenuY = signal(0);

/** Current menu mode: 'lodge' for Lodge tap, 'unit' for unit tap. */
export const radialMenuMode = signal<RadialMenuMode>('lodge');

/** The v3 role of the selected unit (generalist/gather/combat/heal/scout), null for Lodge. */
export const radialMenuUnitRole = signal<string | null>(null);
export const radialMenuTargetEntityId = signal(-1);
export const radialMenuSpecialistMode = signal<SpecialistZoneMode | null>(null);

/**
 * Open the radial menu at the given screen position.
 */
export function openRadialMenu(
  screenX: number,
  screenY: number,
  mode: RadialMenuMode,
  unitRole: string | null = null,
  targetEntityId = -1,
  specialistMode: SpecialistZoneMode | null = null,
): void {
  radialMenuX.value = screenX;
  radialMenuY.value = screenY;
  radialMenuMode.value = mode;
  radialMenuUnitRole.value = unitRole;
  radialMenuTargetEntityId.value = targetEntityId;
  radialMenuSpecialistMode.value = specialistMode;
  radialMenuOpen.value = true;
}

/**
 * Close the radial menu.
 */
export function closeRadialMenu(): void {
  radialMenuOpen.value = false;
  radialMenuTargetEntityId.value = -1;
  radialMenuSpecialistMode.value = null;
}
