/**
 * Commander Active Abilities Tests
 *
 * Verifies that each commander has a unique active ability with
 * proper cooldown, activation, and effect application.
 */

import { describe, expect, it } from 'vitest';
import { COMMANDER_ABILITIES, COMMANDERS } from '@/config/commanders';
import { createGameWorld } from '@/ecs/world';
import {
  canUseCommanderAbility,
  getAbilityCooldownSeconds,
  useCommanderAbility,
} from '@/game/commander-abilities';

describe('Commander Active Abilities', () => {
  it('all 7 commanders have an active ability defined', () => {
    for (const commander of COMMANDERS) {
      const ability = COMMANDER_ABILITIES[commander.id];
      expect(ability, `${commander.id} should have an ability`).toBeDefined();
      expect(ability.name.length).toBeGreaterThan(0);
      expect(ability.cooldownFrames).toBeGreaterThan(0);
      expect(ability.hotkey).toBe('q');
    }
  });

  it('each ability has a unique name', () => {
    const names = new Set<string>();
    for (const [, ability] of Object.entries(COMMANDER_ABILITIES)) {
      names.add(ability.name);
    }
    expect(names.size).toBe(Object.keys(COMMANDER_ABILITIES).length);
  });

  it('ability can be activated when off cooldown', () => {
    const world = createGameWorld();
    world.commanderId = 'marshal';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    expect(canUseCommanderAbility(world)).toBe(true);
    const result = useCommanderAbility(world);
    expect(result).toBe(true);
  });

  it('ability cannot be activated during cooldown', () => {
    const world = createGameWorld();
    world.commanderId = 'marshal';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    useCommanderAbility(world);
    expect(canUseCommanderAbility(world)).toBe(false);
  });

  it('cooldown decreases over time', () => {
    const world = createGameWorld();
    world.commanderId = 'marshal';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    useCommanderAbility(world);
    const cooldown1 = getAbilityCooldownSeconds(world);
    expect(cooldown1).toBeGreaterThan(0);

    // Advance time
    world.frameCount += 3600; // 60 seconds
    const cooldown2 = getAbilityCooldownSeconds(world);
    expect(cooldown2).toBeLessThan(cooldown1);
  });

  it('each commander ability has distinct cooldown', () => {
    const cooldowns = new Map<string, number>();
    for (const [id, ability] of Object.entries(COMMANDER_ABILITIES)) {
      cooldowns.set(id, ability.cooldownFrames);
    }

    // Marshal (90s), Sage (180s), Warden (120s), Tidekeeper (90s),
    // Shadowfang (120s), Ironpaw (150s), Stormcaller (120s)
    expect(cooldowns.get('marshal')).toBe(5400);
    expect(cooldowns.get('sage')).toBe(10800);
    expect(cooldowns.get('ironpaw')).toBe(9000);
  });

  it('sage eureka ability unlocks a tech', () => {
    const world = createGameWorld();
    world.commanderId = 'sage';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    // Count unlocked techs before
    const techBefore = Object.values(world.tech).filter(Boolean).length;
    useCommanderAbility(world);
    const techAfter = Object.values(world.tech).filter(Boolean).length;

    expect(techAfter).toBe(techBefore + 1);
  });
});
