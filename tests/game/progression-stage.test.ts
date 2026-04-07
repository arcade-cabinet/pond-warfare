import { describe, expect, it } from 'vitest';
import { getPlayableProgressionStage } from '@/game/progression-stage';

describe('getPlayableProgressionStage', () => {
  it('starts fresh runs at stage 1', () => {
    expect(getPlayableProgressionStage(0)).toBe(1);
  });

  it('clamps invalid values to stage 1', () => {
    expect(getPlayableProgressionStage(-3)).toBe(1);
    expect(getPlayableProgressionStage(Number.NaN)).toBe(1);
  });

  it('passes through unlocked stages', () => {
    expect(getPlayableProgressionStage(1)).toBe(1);
    expect(getPlayableProgressionStage(4)).toBe(4);
    expect(getPlayableProgressionStage(6.9)).toBe(6);
  });
});
