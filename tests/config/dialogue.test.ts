import { describe, expect, it } from 'vitest';
import { pickDialogue } from '@/config/dialogue';
import { LOOKOUT_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

describe('pickDialogue', () => {
  it('returns canonical Mudpaw combat barks', () => {
    expect(pickDialogue(MUDPAW_KIND, 'combat')).toBeTruthy();
  });

  it('returns Sapper attack barks', () => {
    expect(pickDialogue(EntityKind.Sapper, 'attack')).toBeTruthy();
  });

  it('routes legacy Brawler bark lookups through the Sapper pool', () => {
    expect(pickDialogue(EntityKind.Brawler, 'attack')).toBeTruthy();
  });

  it('returns Saboteur attack barks', () => {
    expect(pickDialogue(EntityKind.Saboteur, 'attack')).toBeTruthy();
  });

  it('routes legacy Sniper bark lookups through the Saboteur pool', () => {
    expect(pickDialogue(EntityKind.Sniper, 'attack')).toBeTruthy();
  });

  it('returns Shaman healing barks', () => {
    expect(pickDialogue(EntityKind.Shaman, 'heal')).toBeTruthy();
  });

  it('returns Lookout discovery barks through the Scout chassis', () => {
    expect(pickDialogue(LOOKOUT_KIND, 'discover')).toBeTruthy();
  });
});
