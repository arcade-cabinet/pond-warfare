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
  commanderFullHp: boolean;
  gameMinutes: number;
  peakArmy: number;
  techCount: number;
  maxBranchTechCount: number;
  totalPearls: number;
  totalClams: number;
  buildingsBuilt: number;
  buildingsLost: number;
  onlyShadowTechs: boolean;
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
    desc: 'Research 15 technologies',
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

  // ── New Achievements ───────────────────────────────────────────────
  {
    id: 'branch_master',
    name: 'Branch Master',
    desc: 'Research all techs in one branch',
    check: (s) => s.maxBranchTechCount >= 5,
  },
  {
    id: 'full_scholar',
    name: 'Full Scholar',
    desc: 'Research all 25 techs in a single game',
    check: (s) => s.techCount >= 25,
  },
  {
    id: 'commander_guard',
    name: "Commander's Guard",
    desc: 'Win with Commander at full HP',
    check: (s) => s.won && s.commanderFullHp,
  },
  {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    desc: 'Win using only Shadow branch techs',
    check: (s) => s.won && s.onlyShadowTechs && s.techCount >= 1,
  },
  {
    id: 'eco_boom',
    name: 'Eco Boom',
    desc: 'Accumulate 5000 total clams in a single game',
    check: (s) => s.totalClams >= 5000,
  },
  {
    id: 'speedrun_10',
    name: 'Speed Runner',
    desc: 'Win in under 10 minutes',
    check: (s) => s.won && s.gameMinutes < 10,
  },
  {
    id: 'turtle_shell',
    name: 'Turtle Shell',
    desc: 'Win without losing any buildings',
    check: (s) => s.won && s.buildingsLost === 0,
  },
  {
    id: 'massive_army',
    name: 'Grand Army',
    desc: 'Have 30+ combat units at once',
    check: (s) => s.peakArmy >= 30,
  },
  {
    id: 'pearl_hoarder',
    name: 'Pearl Hoarder',
    desc: 'Collect 100 pearls in a single game',
    check: (s) => s.totalPearls >= 100,
  },
  {
    id: 'flawless_victory',
    name: 'Flawless Victory',
    desc: 'Win on Hard+ with zero unit losses',
    check: (s) =>
      s.won &&
      s.unitsLost === 0 &&
      (s.difficulty === 'hard' ||
        s.difficulty === 'nightmare' ||
        s.difficulty === 'ultraNightmare'),
  },
];
