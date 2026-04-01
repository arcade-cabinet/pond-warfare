/**
 * Achievement Definitions
 *
 * Static list of all achievements and the snapshot interface they check against.
 */

/** Snapshot of world state used by achievement check functions. */
export interface AchievementSnapshot {
  unitsKilled: number;
  unitsLost: number;
  killStreak: number;
  nestsDestroyed: number;
  won: boolean;
  lost: boolean;
  difficulty: string;
  maxVetRank: number;
  commanderAlive: boolean;
  gameMinutes: number;
  peakArmy: number;
  techCount: number;
  totalPearls: number;
  buildingsBuilt: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: AchievementSnapshot) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Kill your first enemy',
    check: (s) => s.unitsKilled >= 1,
  },
  {
    id: 'triple_kill',
    name: 'Triple Kill',
    desc: 'Get a 3-kill streak',
    check: (s) => s.killStreak >= 3,
  },
  {
    id: 'rampage',
    name: 'Rampage!',
    desc: 'Get a 5-kill streak',
    check: (s) => s.killStreak >= 5,
  },
  {
    id: 'nest_destroyer',
    name: 'Nest Destroyer',
    desc: 'Destroy an enemy nest',
    check: (s) => s.nestsDestroyed >= 1,
  },
  {
    id: 'victory',
    name: 'Victory',
    desc: 'Win a game',
    check: (s) => s.won,
  },
  {
    id: 'hard_victory',
    name: 'Hard Won',
    desc: 'Win on Hard difficulty',
    check: (s) => s.won && s.difficulty === 'hard',
  },
  {
    id: 'nightmare_victory',
    name: 'Nightmare Survivor',
    desc: 'Win on Nightmare',
    check: (s) => s.won && (s.difficulty === 'nightmare' || s.difficulty === 'ultraNightmare'),
  },
  {
    id: 'hero_unit',
    name: 'Hero of the Pond',
    desc: 'Promote a unit to Hero rank',
    check: (s) => s.maxVetRank >= 3,
  },
  {
    id: 'commander_alive',
    name: 'Untouchable',
    desc: 'Win without Commander dying',
    check: (s) => s.won && s.commanderAlive,
  },
  {
    id: 'speedrun_15',
    name: 'Speed Demon',
    desc: 'Win in under 15 minutes',
    check: (s) => s.won && s.gameMinutes < 15,
  },
  {
    id: 'army_20',
    name: 'War Machine',
    desc: 'Have 20+ combat units',
    check: (s) => s.peakArmy >= 20,
  },
  {
    id: 'full_tech',
    name: 'Scholar',
    desc: 'Research all 15 technologies',
    check: (s) => s.techCount >= 15,
  },
  {
    id: 'pearl_master',
    name: 'Pearl Diver',
    desc: 'Collect 100+ pearls',
    check: (s) => s.totalPearls >= 100,
  },
  {
    id: 'builder',
    name: 'Master Builder',
    desc: 'Build 10+ buildings',
    check: (s) => s.buildingsBuilt >= 10,
  },
  {
    id: 'survivor_30',
    name: 'Endurance',
    desc: 'Survive 30+ minutes',
    check: (s) => s.gameMinutes >= 30,
  },
];
