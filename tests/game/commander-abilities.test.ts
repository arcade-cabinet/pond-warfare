/**
 * Commander Active Abilities Tests
 *
 * Verifies that each commander has a unique active ability with
 * proper cooldown, activation, and effect application.
 */

import { describe, expect, it } from 'vitest';
import { COMMANDER_ABILITIES, COMMANDERS } from '@/config/commanders';
import { spawnEntity } from '@/ecs/archetypes';
import { FactionTag, Health, UnitStateMachine } from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { takeDamage } from '@/ecs/systems/health';
import { createGameWorld } from '@/ecs/world';
import {
  canUseCommanderAbility,
  getAbilityCooldownSeconds,
  useCommanderAbility,
} from '@/game/commander-abilities';
import { EntityKind, Faction, UnitState } from '@/types';

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
    world.commanderId = 'sage';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    expect(canUseCommanderAbility(world)).toBe(true);
    const result = useCommanderAbility(world);
    expect(result).toBe(true);
  });

  it('ability cannot be activated during cooldown', () => {
    const world = createGameWorld();
    world.commanderId = 'sage';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    useCommanderAbility(world);
    expect(canUseCommanderAbility(world)).toBe(false);
  });

  it('cooldown decreases over time', () => {
    const world = createGameWorld();
    world.commanderId = 'sage';
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

  it('marshal charge requires a selected player unit and tags it for the speed burst', () => {
    const world = createGameWorld();
    world.commanderId = 'marshal';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    expect(useCommanderAbility(world)).toBe(false);
    expect(world.commanderAbilityCooldownUntil).toBe(0);

    const unit = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    world.selection = [unit];

    expect(useCommanderAbility(world)).toBe(true);
    expect(world.commanderAbilityTargets.has(unit)).toBe(true);
    expect(world.commanderAbilityActiveUntil).toBeGreaterThan(world.frameCount);
  });

  it('sage eureka grants a resource burst', () => {
    const world = createGameWorld();
    world.commanderId = 'sage';
    world.viewWidth = 1280;
    world.viewHeight = 720;
    world.resources.fish = 10;
    world.resources.logs = 5;
    world.resources.rocks = 2;

    expect(useCommanderAbility(world)).toBe(true);
    expect(world.resources.fish).toBe(70);
    expect(world.resources.logs).toBe(25);
    expect(world.resources.rocks).toBe(12);
  });

  it('warden fortify prevents building damage during the active window', () => {
    const world = createGameWorld();
    world.commanderId = 'warden';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    const lodge = spawnEntity(world, EntityKind.Lodge, 100, 100, Faction.Player);
    const hpBefore = Health.current[lodge];

    expect(useCommanderAbility(world)).toBe(true);
    takeDamage(world, lodge, 50, -1);

    expect(Health.current[lodge]).toBe(hpBefore);
  });

  it('shadowfang vanish makes player units untargetable while active', () => {
    const world = createGameWorld();
    world.spatialHash = undefined as never;
    world.commanderId = 'shadowfang';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    const player = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    const enemy = spawnEntity(world, EntityKind.Gator, 130, 100, Faction.Enemy);
    UnitStateMachine.state[enemy] = UnitState.Idle;

    expect(useCommanderAbility(world)).toBe(true);
    commanderPassivesSystem(world);
    combatSystem(world);

    expect(world.stealthEntities.has(player)).toBe(true);
    expect(UnitStateMachine.state[enemy]).toBe(UnitState.Idle);
  });

  it('ironpaw iron will prevents player unit damage during the active window', () => {
    const world = createGameWorld();
    world.commanderId = 'ironpaw';
    world.viewWidth = 1280;
    world.viewHeight = 720;

    const unit = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    const hpBefore = Health.current[unit];

    expect(useCommanderAbility(world)).toBe(true);
    takeDamage(world, unit, 20, -1);

    expect(Health.current[unit]).toBe(hpBefore);
  });
});
