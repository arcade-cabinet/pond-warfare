/**
 * Advisor Tip Definitions
 *
 * All economy, war, and builder tips with pure condition functions.
 * Conditions must be lightweight -- they run every eval cycle (~60 frames).
 * ECS query helpers live in tip-helpers.ts.
 */

import { EntityKind } from '@/types';
import {
  anyTechResearched,
  countEnemyUnits,
  countIdleGatherers,
  countPlayerBuildings,
  countPlayerCombatUnits,
  lodgeUnderPressure,
  totalClamResources,
} from './tip-helpers';
import type { AdvisorTip } from './types';

// ---------------------------------------------------------------------------
// Economy Tips
// ---------------------------------------------------------------------------

const economyTips: AdvisorTip[] = [
  {
    id: 'idle_gatherers_intro',
    advisor: 'economy',
    message:
      'You have idle gatherers! Select them and right-click a Clam deposit to start collecting resources.',
    condition: (w) => countIdleGatherers(w) > 0 && w.frameCount > 180,
    cooldown: 2400,
    priority: 85,
    oncePerGame: true,
    action: 'open-forces',
  },
  {
    id: 'idle_gatherers',
    advisor: 'economy',
    message: 'Some gatherers are standing around idle. Open Forces and assign them to resources.',
    condition: (w) => countIdleGatherers(w) > 0 && w.frameCount > 300,
    cooldown: 1800,
    priority: 80,
    action: 'open-forces',
  },
  {
    id: 'low_clams',
    advisor: 'economy',
    message: 'Clam deposits are running low. Explore to find new resource patches.',
    condition: (w) => totalClamResources(w) < 200 && w.frameCount > 600,
    cooldown: 3600,
    priority: 60,
  },
  {
    id: 'pop_cap',
    advisor: 'economy',
    message:
      'You have reached your population cap! Build a Lodge or upgrade to increase food supply.',
    condition: (w) => w.resources.food >= w.resources.maxFood && w.resources.maxFood > 0,
    cooldown: 1200,
    priority: 100,
    action: 'open-buildings',
  },
  {
    id: 'no_food_buildings',
    advisor: 'economy',
    message: 'You need food buildings to grow your population. Build a Lodge!',
    condition: (w) =>
      countPlayerBuildings(w, EntityKind.Lodge) === 0 &&
      w.resources.food >= w.resources.maxFood &&
      w.frameCount > 600,
    cooldown: 2400,
    priority: 90,
    action: 'open-buildings',
  },
];

// ---------------------------------------------------------------------------
// War Tips
// ---------------------------------------------------------------------------

const warTips: AdvisorTip[] = [
  {
    id: 'enemies_spotted',
    advisor: 'war',
    message: 'Enemies spotted nearby! Train some Brawlers at the Armory to defend.',
    condition: (w) => countEnemyUnits(w) > 0 && countPlayerCombatUnits(w) < 3,
    cooldown: 2400,
    priority: 90,
    action: 'open-buildings',
  },
  {
    id: 'lodge_under_attack',
    advisor: 'war',
    message: 'Your Lodge is under attack! Rally all defenders immediately!',
    condition: (w) => lodgeUnderPressure(w),
    cooldown: 600,
    priority: 120,
    action: 'open-forces',
  },
  {
    id: 'no_armory',
    advisor: 'war',
    message: 'Build an Armory to unlock combat units. You will need defenders soon!',
    condition: (w) => w.frameCount > 1200 && countPlayerBuildings(w, EntityKind.Armory) === 0,
    cooldown: 3600,
    priority: 70,
    oncePerGame: true,
    action: 'open-buildings',
  },
  {
    id: 'army_weak',
    advisor: 'war',
    message: 'The enemy force outnumbers you significantly. Train more combat units!',
    condition: (w) => countEnemyUnits(w) > countPlayerCombatUnits(w) * 2 + 3,
    cooldown: 3000,
    priority: 80,
  },
  {
    id: 'peace_ending',
    advisor: 'war',
    message: 'The peace period is ending soon. Prepare your defenses!',
    condition: (w) => {
      const remaining = w.peaceTimer - w.frameCount;
      return remaining > 0 && remaining < 1800;
    },
    cooldown: 1800,
    priority: 100,
    oncePerGame: true,
  },
];

// ---------------------------------------------------------------------------
// Builder Tips
// ---------------------------------------------------------------------------

const builderTips: AdvisorTip[] = [
  {
    id: 'research_available',
    advisor: 'builder',
    message: 'Research techs at the Lodge to unlock new capabilities and stronger units.',
    condition: (w) =>
      countPlayerBuildings(w, EntityKind.Lodge) > 0 && !anyTechResearched(w) && w.frameCount > 900,
    cooldown: 3600,
    priority: 50,
    oncePerGame: true,
    action: 'open-tech-tree',
  },
  {
    id: 'queue_empty',
    advisor: 'builder',
    message: 'Your training queues are empty. Keep producing units to grow your force!',
    condition: (w) => {
      const armories = countPlayerBuildings(w, EntityKind.Armory);
      return (
        armories > 0 &&
        w.resources.clams >= 80 &&
        countPlayerCombatUnits(w) < 4 &&
        w.frameCount > 1800
      );
    },
    cooldown: 2400,
    priority: 40,
    action: 'open-buildings',
  },
  {
    id: 'open_forces_tab',
    advisor: 'builder',
    message: 'You have a growing army! Open the Forces tab to manage unit behaviors.',
    condition: (w) => countPlayerCombatUnits(w) >= 3,
    cooldown: 3600,
    priority: 60,
    oncePerGame: true,
    action: 'open-forces',
  },
  {
    id: 'build_tower',
    advisor: 'builder',
    message: 'Build a Tower near your Lodge to help defend against attacks!',
    condition: (w) => lodgeUnderPressure(w) && countPlayerBuildings(w, EntityKind.Tower) === 0,
    cooldown: 3000,
    priority: 75,
    action: 'open-buildings',
  },
  {
    id: 'upgrade_lodge',
    advisor: 'builder',
    message: 'Your Lodge can be upgraded for more population capacity. Research Sturdy Mud!',
    condition: (w) =>
      countPlayerBuildings(w, EntityKind.Lodge) > 0 &&
      !w.tech.sturdyMud &&
      w.resources.clams >= 200 &&
      w.resources.twigs >= 300 &&
      w.frameCount > 1800,
    cooldown: 4800,
    priority: 45,
    action: 'open-tech-tree',
  },
];

/** All advisor tips as a flat array, ready for the evaluation system. */
export const ADVISOR_TIPS: AdvisorTip[] = [...economyTips, ...warTips, ...builderTips];
