import { describe, expect, it } from 'vitest';
import { pickDialogue } from '@/config/dialogue';
import { EntityKind } from '@/types';

describe('pickDialogue', () => {
  it('returns canonical Mudpaw combat barks', () => {
    expect(pickDialogue(EntityKind.Gatherer, 'combat')).toBeTruthy();
  });

  it('returns Sapper attack barks', () => {
    expect(pickDialogue(EntityKind.Sapper, 'attack')).toBeTruthy();
  });

  it('returns Saboteur attack barks', () => {
    expect(pickDialogue(EntityKind.Saboteur, 'attack')).toBeTruthy();
  });

  it('returns Shaman healing barks', () => {
    expect(pickDialogue(EntityKind.Shaman, 'heal')).toBeTruthy();
  });

  it('returns Lookout discovery barks through the Scout chassis', () => {
    expect(pickDialogue(EntityKind.Scout, 'discover')).toBeTruthy();
  });
});
