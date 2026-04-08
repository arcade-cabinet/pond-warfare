import { describe, expect, it } from 'vitest';
import { getFactionConfig, OTTER_FACTION, PREDATOR_FACTION } from '@/config/factions';
import { MEDIC_KIND, MUDPAW_KIND, SABOTEUR_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

describe('faction configs', () => {
  it('maps the otter compatibility faction to the canonical live roster', () => {
    expect(OTTER_FACTION.generalistKind).toBe(MUDPAW_KIND);
    expect(OTTER_FACTION.frontlineKind).toBe(SAPPER_KIND);
    expect(OTTER_FACTION.skirmisherKind).toBe(SABOTEUR_KIND);
    expect(OTTER_FACTION.heavyKind).toBe(SAPPER_KIND);
    expect(OTTER_FACTION.supportKind).toBe(MEDIC_KIND);
    expect(OTTER_FACTION.siegeKind).toBe(SAPPER_KIND);
    expect(OTTER_FACTION.commanderKind).toBe(EntityKind.Commander);
  });

  it('keeps predator faction mappings intact', () => {
    expect(PREDATOR_FACTION.lodgeKind).toBe(EntityKind.PredatorNest);
    expect(PREDATOR_FACTION.frontlineKind).toBe(EntityKind.Gator);
    expect(PREDATOR_FACTION.skirmisherKind).toBe(EntityKind.VenomSnake);
    expect(PREDATOR_FACTION.supportKind).toBe(EntityKind.SwampDrake);
    expect(PREDATOR_FACTION.siegeKind).toBe(EntityKind.SiegeTurtle);
  });

  it('getFactionConfig resolves both factions', () => {
    expect(getFactionConfig('otter')).toBe(OTTER_FACTION);
    expect(getFactionConfig('predator')).toBe(PREDATOR_FACTION);
  });
});
