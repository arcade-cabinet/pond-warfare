/**
 * Building Construction Stage Tests
 *
 * Validates that building progress maps to correct visual stages
 * (alpha and tint values).
 */

import { describe, expect, it } from 'vitest';
import { getBuildingStage } from '@/rendering/pixi/entity-renderer';

describe('getBuildingStage', () => {
  describe('foundation stage (0-33%)', () => {
    it('should return 40% alpha and brown tint at 0% progress', () => {
      const stage = getBuildingStage(0);
      expect(stage.alpha).toBe(0.4);
      expect(stage.tint).toBe(0xb08050);
    });

    it('should return 40% alpha and brown tint at 15% progress', () => {
      const stage = getBuildingStage(15);
      expect(stage.alpha).toBe(0.4);
      expect(stage.tint).toBe(0xb08050);
    });

    it('should return 40% alpha and brown tint at 33% progress', () => {
      const stage = getBuildingStage(33);
      expect(stage.alpha).toBe(0.4);
      expect(stage.tint).toBe(0xb08050);
    });
  });

  describe('frame stage (34-66%)', () => {
    it('should return 70% alpha and no tint at 34% progress', () => {
      const stage = getBuildingStage(34);
      expect(stage.alpha).toBe(0.7);
      expect(stage.tint).toBe(0xffffff);
    });

    it('should return 70% alpha at 50% progress', () => {
      const stage = getBuildingStage(50);
      expect(stage.alpha).toBe(0.7);
    });

    it('should return 70% alpha at 66% progress', () => {
      const stage = getBuildingStage(66);
      expect(stage.alpha).toBe(0.7);
      expect(stage.tint).toBe(0xffffff);
    });
  });

  describe('almost complete stage (67-99%)', () => {
    it('should return 90% alpha and no tint at 67% progress', () => {
      const stage = getBuildingStage(67);
      expect(stage.alpha).toBe(0.9);
      expect(stage.tint).toBe(0xffffff);
    });

    it('should return 90% alpha at 80% progress', () => {
      const stage = getBuildingStage(80);
      expect(stage.alpha).toBe(0.9);
    });

    it('should return 90% alpha at 99% progress', () => {
      const stage = getBuildingStage(99);
      expect(stage.alpha).toBe(0.9);
      expect(stage.tint).toBe(0xffffff);
    });
  });

  describe('foundation tint is distinct', () => {
    it('foundation tint differs from default (white)', () => {
      const foundation = getBuildingStage(10);
      const frame = getBuildingStage(50);
      expect(foundation.tint).not.toBe(frame.tint);
    });

    it('only foundation stage applies brown tint', () => {
      expect(getBuildingStage(0).tint).toBe(0xb08050);
      expect(getBuildingStage(34).tint).toBe(0xffffff);
      expect(getBuildingStage(67).tint).toBe(0xffffff);
    });
  });

  describe('alpha values increase with progress', () => {
    it('each stage has higher alpha than the previous', () => {
      const foundation = getBuildingStage(10);
      const frame = getBuildingStage(50);
      const almostDone = getBuildingStage(90);
      expect(foundation.alpha).toBeLessThan(frame.alpha);
      expect(frame.alpha).toBeLessThan(almostDone.alpha);
    });
  });
});
