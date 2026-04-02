/**
 * Campaign Branching Tests
 *
 * Validates branch choice after Mission 3, mission 4A/4B definitions,
 * and campaign state path tracking.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  BRANCH_MISSIONS,
  CAMPAIGN_MISSIONS,
  type CampaignState,
  createCampaignState,
  getMission,
} from '@/campaign';

describe('Campaign branching', () => {
  describe('Mission definitions', () => {
    it('should have Mission 3 with id "the-nest-must-fall"', () => {
      const m3 = getMission('the-nest-must-fall');
      expect(m3).toBeDefined();
      expect(m3?.number).toBe(3);
    });

    it('should define Mission 4A "Predator\'s Lair"', () => {
      const m4a = BRANCH_MISSIONS.A;
      expect(m4a.id).toBe('predators-lair');
      expect(m4a.number).toBe(4);
      expect(m4a.title).toBe("Predator's Lair");
      expect(m4a.objectives).toHaveLength(1);
      expect(m4a.objectives[0].type).toBe('destroyNest');
      expect(m4a.objectives[0].count).toBe(3);
    });

    it('should define Mission 4B "Siege of the Lodge"', () => {
      const m4b = BRANCH_MISSIONS.B;
      expect(m4b.id).toBe('siege-of-the-lodge');
      expect(m4b.number).toBe(4);
      expect(m4b.title).toBe('Siege of the Lodge');
      expect(m4b.objectives).toHaveLength(1);
      expect(m4b.objectives[0].type).toBe('survive');
    });

    it('should give Mission 4A starting techs sharpSticks and swiftPaws', () => {
      expect(BRANCH_MISSIONS.A.worldOverrides?.startingTech).toEqual(
        expect.arrayContaining(['sharpSticks', 'swiftPaws']),
      );
    });

    it('should give Mission 4B starting techs sturdyMud and herbalMedicine', () => {
      expect(BRANCH_MISSIONS.B.worldOverrides?.startingTech).toEqual(
        expect.arrayContaining(['sturdyMud', 'herbalMedicine']),
      );
    });

    it('both paths should lead to Mission 5 (mission 5 exists)', () => {
      const m5 = getMission('alpha-strike');
      expect(m5).toBeDefined();
      expect(m5?.number).toBe(5);
    });

    it('main CAMPAIGN_MISSIONS should still have 5 missions in order', () => {
      expect(CAMPAIGN_MISSIONS).toHaveLength(5);
      expect(CAMPAIGN_MISSIONS.map((m) => m.number)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('CampaignState path tracking', () => {
    let state: CampaignState;

    beforeEach(() => {
      state = createCampaignState(null);
    });

    it('should default path to null', () => {
      expect(state.path).toBeNull();
    });

    it('should accept path A when creating state', () => {
      state = createCampaignState(BRANCH_MISSIONS.A, 'A');
      expect(state.path).toBe('A');
      expect(state.mission?.id).toBe('predators-lair');
    });

    it('should accept path B when creating state', () => {
      state = createCampaignState(BRANCH_MISSIONS.B, 'B');
      expect(state.path).toBe('B');
      expect(state.mission?.id).toBe('siege-of-the-lodge');
    });

    it('should initialize objective status for branch missions', () => {
      state = createCampaignState(BRANCH_MISSIONS.A, 'A');
      expect(state.objectiveStatus.size).toBe(1);
      expect(state.objectiveStatus.get('destroy-3-nests')).toBe(false);
    });
  });
});
