/** Achievement Definitions — static list of all achievements and snapshot interface. */

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
  totalFish: number;
  buildingsBuilt: number;
  buildingsLost: number;
  onlyShadowTechs: boolean;
  // v2.1.0 — extended stats for new achievements
  weatherTypesExperienced: number;
  warshipKills: number;
  bridgesBuilt: number;
  diverAmbushKills: number;
  marketTrades: number;
  maxBerserkerKills: number;
  shrineAbilitiesUsed: number;
  coopMode: boolean;
  dailyChallengesCompleted: number;
  playerLevel: number;
  perfectPuzzleCount: number;
  randomEventsExperienced: number;
  wallsBuilt: number;
  enemiesBlockedByGates: number;
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
    desc: 'Accumulate 5000 total fish in a single game',
    check: (s) => s.totalFish >= 5000,
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

  // ── v2.1.0 — Content Update Achievements ──────────────────────────
  {
    id: 'weather_master',
    name: 'Weather Master',
    desc: 'Win a game that had all 4 weather types',
    check: (s) => s.won && s.weatherTypesExperienced >= 4,
  },
  {
    id: 'naval_supremacy',
    name: 'Naval Supremacy',
    desc: 'Destroy 5 enemy units with Warships',
    check: (s) => s.warshipKills >= 5,
  },
  {
    id: 'bridge_builder',
    name: 'Bridge Builder',
    desc: 'Build 3 temporary bridges in one game',
    check: (s) => s.bridgesBuilt >= 3,
  },
  {
    id: 'stealth_expert',
    name: 'Stealth Expert',
    desc: 'Get 5 ambush kills with Divers in one game',
    check: (s) => s.diverAmbushKills >= 5,
  },
  {
    id: 'market_mogul',
    name: 'Market Mogul',
    desc: 'Complete 10 trades at the Market',
    check: (s) => s.marketTrades >= 10,
  },
  {
    id: 'berserkers_fury',
    name: "Berserker's Fury",
    desc: 'Get 10 kills with a single Berserker before it dies',
    check: (s) => s.maxBerserkerKills >= 10,
  },
  {
    id: 'shrine_master',
    name: 'Shrine Master',
    desc: 'Use all 5 Shrine abilities across your career',
    check: (s) => s.shrineAbilitiesUsed >= 5,
  },
  {
    id: 'coop_victory',
    name: 'Co-op Victory',
    desc: 'Win a game in co-op mode',
    check: (s) => s.won && s.coopMode,
  },
  {
    id: 'daily_dedication',
    name: 'Daily Dedication',
    desc: 'Complete 7 daily challenges',
    check: (s) => s.dailyChallengesCompleted >= 7,
  },
  {
    id: 'level_10',
    name: 'Level 10',
    desc: 'Reach player level 10',
    check: (s) => s.playerLevel >= 10,
  },
  {
    id: 'puzzle_pro',
    name: 'Puzzle Pro',
    desc: 'Get 3 stars on all 10 puzzles',
    check: (s) => s.perfectPuzzleCount >= 10,
  },
  {
    id: 'event_survivor',
    name: 'Event Survivor',
    desc: 'Experience all 8 random events',
    check: (s) => s.randomEventsExperienced >= 8,
  },
  {
    id: 'wall_builder',
    name: 'Wall Builder',
    desc: 'Build 10 Wall segments in one game',
    check: (s) => s.wallsBuilt >= 10,
  },
  {
    id: 'gate_keeper',
    name: 'Gate Keeper',
    desc: 'Block 20 enemies with Wall Gates',
    check: (s) => s.enemiesBlockedByGates >= 20,
  },
  {
    id: 'dock_master',
    name: 'Dock Master',
    desc: 'Build a Dock and launch 3 Warships in one game',
    check: (s) => s.warshipKills >= 1 && s.buildingsBuilt >= 1,
  },
];
