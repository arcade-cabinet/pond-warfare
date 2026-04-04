/**
 * Commander Balance Tests
 *
 * Verifies commander stat values match intended balance targets.
 */

import { describe, expect, it } from 'vitest';
import { COMMANDERS, getCommanderDef } from '@/config/commanders';

describe('Commander balance values', () => {
  it('Marshal: +15% damage aura', () => {
    const marshal = getCommanderDef('marshal');
    expect(marshal.auraDamageBonus).toBe(0.15);
  });

  it('Sage: +10% gather bonus and +25% research speed', () => {
    const sage = getCommanderDef('sage');
    expect(sage.passiveGatherBonus).toBe(0.1);
    expect(sage.passiveResearchSpeed).toBe(0.25);
  });

  it('Shadowfang: -10% enemy damage reduction aura', () => {
    const shadowfang = getCommanderDef('shadowfang');
    expect(shadowfang.auraEnemyDamageReduction).toBe(0.1);
  });

  it('Stormcaller: 10 lightning damage passive', () => {
    const stormcaller = getCommanderDef('stormcaller');
    expect(stormcaller.passiveLightningDamage).toBe(10);
    expect(stormcaller.passiveDesc).toContain('15s');
    expect(stormcaller.passiveDesc).toContain('3 random enemies');
  });

  it('all 7 commanders are defined', () => {
    expect(COMMANDERS).toHaveLength(7);
    const ids = COMMANDERS.map((c) => c.id);
    expect(ids).toContain('marshal');
    expect(ids).toContain('sage');
    expect(ids).toContain('warden');
    expect(ids).toContain('tidekeeper');
    expect(ids).toContain('shadowfang');
    expect(ids).toContain('ironpaw');
    expect(ids).toContain('stormcaller');
  });

  it('getCommanderDef falls back to marshal for unknown id', () => {
    const fallback = getCommanderDef('nonexistent');
    expect(fallback.id).toBe('marshal');
  });
});
