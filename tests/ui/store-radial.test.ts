// @vitest-environment jsdom
/**
 * Tests: Radial Menu Store (v3.0 — US9)
 *
 * Validates:
 * - openRadialMenu sets all signals correctly
 * - closeRadialMenu resets open signal
 * - Mode and role are preserved
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeRadialMenu,
  openRadialMenu,
  radialMenuMode,
  radialMenuOpen,
  radialMenuSpecialistMode,
  radialMenuTargetEntityId,
  radialMenuUnitRole,
  radialMenuX,
  radialMenuY,
} from '@/ui/store-radial';

beforeEach(() => {
  closeRadialMenu();
});

describe('openRadialMenu', () => {
  it('opens the menu at the given position with lodge mode', () => {
    openRadialMenu(100, 200, 'lodge');

    expect(radialMenuOpen.value).toBe(true);
    expect(radialMenuX.value).toBe(100);
    expect(radialMenuY.value).toBe(200);
    expect(radialMenuMode.value).toBe('lodge');
    expect(radialMenuUnitRole.value).toBeNull();
    expect(radialMenuTargetEntityId.value).toBe(-1);
    expect(radialMenuSpecialistMode.value).toBeNull();
  });

  it('opens the menu with unit mode and role', () => {
    openRadialMenu(300, 400, 'unit', 'combat', 42, 'dual_zone');

    expect(radialMenuOpen.value).toBe(true);
    expect(radialMenuX.value).toBe(300);
    expect(radialMenuY.value).toBe(400);
    expect(radialMenuMode.value).toBe('unit');
    expect(radialMenuUnitRole.value).toBe('combat');
    expect(radialMenuTargetEntityId.value).toBe(42);
    expect(radialMenuSpecialistMode.value).toBe('dual_zone');
  });

  it('overrides previous state when called again', () => {
    openRadialMenu(100, 200, 'lodge');
    openRadialMenu(500, 600, 'unit', 'heal');

    expect(radialMenuX.value).toBe(500);
    expect(radialMenuY.value).toBe(600);
    expect(radialMenuMode.value).toBe('unit');
    expect(radialMenuUnitRole.value).toBe('heal');
  });
});

describe('closeRadialMenu', () => {
  it('sets radialMenuOpen to false', () => {
    openRadialMenu(100, 200, 'lodge');
    expect(radialMenuOpen.value).toBe(true);

    closeRadialMenu();
    expect(radialMenuOpen.value).toBe(false);
    expect(radialMenuTargetEntityId.value).toBe(-1);
    expect(radialMenuSpecialistMode.value).toBeNull();
  });
});
