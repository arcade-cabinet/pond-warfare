> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Pond Warfare v2.0.0 — Expansion

## Overview

v2.0.0 is the major expansion — weather that changes gameplay, naval combat via Docks, a replay system for competitive play, puzzle missions as a new game mode, and branch-themed cosmetics that reward tech specialization. This transforms Pond Warfare from a solid RTS into a deep, endlessly replayable game with multiple ways to play.

## User Stories

### US1: Weather System
As a player, I want dynamic weather that changes gameplay each match, so that no two games feel identical even on the same map.

Acceptance Criteria:
- [ ] 4 weather types: Clear, Rain, Fog, Wind
- [ ] Weather changes every 3-5 minutes (seeded from map seed for determinism)
- [ ] Rain: all units -15% speed on Grass (mud effect), Shallows tiles become impassable (flooding)
- [ ] Fog: vision range reduced 40% for all units (fog of war closes in)
- [ ] Wind: projectiles drift in wind direction (affects Sniper/Catapult accuracy +-15px offset)
- [ ] Clear: normal conditions (no modifiers)
- [ ] Visual: rain particles, fog overlay opacity increase, wind particles
- [ ] HUD indicator showing current weather + next weather transition time
- [ ] Weather affects both player and enemy equally

### US2: Dock Building + Water Units
As a player, I want to build Docks on water tiles to train naval units, so that water terrain becomes a strategic dimension rather than just an obstacle.

Acceptance Criteria:
- [ ] Dock building (HP: 120, Cost: 200C 150T), must be placed on Shallows tiles
- [ ] Dock trains: Swimmer, Diver (moved from Lodge to Dock)
- [ ] New unit: Otter Warship (HP: 80, Speed: 1.5 on water/0.5 on land, Damage: 12, Range: 200)
- [ ] Warship can only be trained at Dock
- [ ] Warship fires projectiles like Sniper but with splash damage
- [ ] Dock provides +2 food cap
- [ ] Archipelago/River/Island maps become tactically richer with naval control

### US3: Replay System
As a player, I want to record and replay my games, so that I can learn from mistakes and share impressive victories.

Acceptance Criteria:
- [ ] ReplayRecorder already exists (src/game.ts) — verify it captures all inputs
- [ ] Save replay to file after game ends (auto-save, stored alongside game save)
- [ ] Replay viewer: loads replay file, plays back game with full visual rendering
- [ ] Replay controls: play/pause, speed (1x/2x/4x/8x), skip to timestamp
- [ ] Replay shows full map (no fog of war)
- [ ] Replay accessible from game-over screen ("Watch Replay" button)
- [ ] Replay accessible from leaderboard ("Watch" next to each entry)

### US4: Puzzle Missions (New Game Mode)
As a player, I want tactical puzzle missions with fixed starting units and specific objectives, so that I can test my micro and strategic thinking.

Acceptance Criteria:
- [ ] New game mode: "Puzzles" selectable from main menu
- [ ] 5 initial puzzles with escalating difficulty
- [ ] Puzzle 1: "First Strike" — 3 Brawlers, destroy 1 nest, no training allowed
- [ ] Puzzle 2: "Stealth Run" — 2 Divers, infiltrate to enemy Lodge without being detected
- [ ] Puzzle 3: "Hold the Bridge" — 5 units, defend a bridge chokepoint for 3 minutes
- [ ] Puzzle 4: "Economy Race" — 4 Gatherers, accumulate 1000 clams before the enemy
- [ ] Puzzle 5: "Commander Down" — Kill the enemy Alpha with only your Commander + 2 Healers
- [ ] Each puzzle has: fixed map, fixed starting units, specific win condition, par time
- [ ] Star rating: 1 star (complete), 2 stars (under par time), 3 stars (no unit losses)
- [ ] Puzzle completion tracked in achievements/unlocks

### US5: Branch-Themed Cosmetics
As a player, I want visual cosmetic themes that activate when I specialize in a tech branch, so that my army visually reflects my strategic choices.

Acceptance Criteria:
- [ ] 5 cosmetic themes (1 per branch), auto-activate when all 5 techs in a branch are researched
- [ ] Lodge theme: units get leaf/vine particle trail
- [ ] Nature theme: units emit green healing glow particles
- [ ] Warfare theme: units get red damage spark particles
- [ ] Fortifications theme: units get shield shimmer overlay
- [ ] Shadow theme: units get dark mist/shadow trail
- [ ] Particles are subtle (don't obscure gameplay) but clearly visible
- [ ] Multiple themes can be active simultaneously (researched all Lodge + Warfare = both active)
- [ ] Deactivates if you haven't researched the full branch

### US6: Otter Berserker Unit
As a player, I want a high-risk high-reward melee unit that deals massive damage but loses HP over time, so that aggressive plays have a meaningful tradeoff.

Acceptance Criteria:
- [ ] New unit: Berserker (HP: 60, Speed: 2.0, Damage: 15, Range: melee)
- [ ] Loses 1 HP every 60 frames (1/second) when in combat (Attacking state)
- [ ] Gains +5% damage for every 10% HP lost (max +50% at 10% HP)
- [ ] Unlocked via Shadow branch: Venom Coating tech
- [ ] Trained at Armory, Cost: 120C 80T, Food: 1
- [ ] Red rage particles when below 50% HP
- [ ] Death animation is dramatic (larger explosion)

### US7: Wall Gate Building
As a player, I want gates in my walls that let friendly units through but block enemies, so that walls are defensive tools, not mobility traps.

Acceptance Criteria:
- [ ] Wall Gate building (HP: 80, Cost: 60C 40T)
- [ ] Placed adjacent to Wall segments
- [ ] Player units pass through (no collision)
- [ ] Enemy units are blocked (treated as wall)
- [ ] Visual: slightly different from wall (arch/opening sprite)
- [ ] Can be destroyed by enemies (becomes passable breach)

### US8: Shrine Building (One-Time Abilities)
As a player, I want Shrine buildings that provide powerful one-time activated abilities, so that there's a reason to invest in expensive late-game structures.

Acceptance Criteria:
- [ ] Shrine building (HP: 60, Cost: 300C 200T 25P)
- [ ] When selected, shows 1 ability button based on which tech branch has most researched techs
- [ ] Lodge Shrine: "Flood" — all Water tiles expand by 1 tile for 30 seconds (blocks enemy movement)
- [ ] Nature Shrine: "Bloom" — heal all units to full HP
- [ ] Warfare Shrine: "Meteor" — massive AoE damage at target location (like Stormcaller but bigger)
- [ ] Fortifications Shrine: "Stone Wall" — instantly build a ring of walls around the Lodge
- [ ] Shadow Shrine: "Eclipse" — all enemies blinded for 15 seconds (stop moving/attacking)
- [ ] One use per Shrine, then it crumbles (building destroyed after activation)
- [ ] Requires at least 3 techs in the dominant branch

## Technical Requirements

- Weather system as a new ECS system checking world.weather state
- Dock placement validator (must be on Shallows)
- ReplayRecorder already exists — extend with save/load + viewer
- Puzzle definitions as static config objects (like campaign missions)
- Cosmetic particles via existing particle system
- All files < 300 LOC

## Out of Scope

- Multiplayer networking
- Map editor
- Mod support

## Implementation Plan

Phase 1: Weather + Dock/Naval (US1, US2)
Phase 2: Replay + Puzzles (US3, US4)
Phase 3: Cosmetics + New Units/Buildings (US5, US6, US7, US8)
