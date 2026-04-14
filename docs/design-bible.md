---
title: Game Design Bible (Historical)
updated: 2026-04-10
status: archived
domain: creative
---

# Pond Warfare - Game Design Bible (Historical Reference)

> **Historical note:** This design bible preserves older v1/v2 direction and art intent. It is not the canonical gameplay or unit-model spec for the current game. For the live model, use [docs/gameplay.md](docs/gameplay.md), [docs/architecture.md](docs/architecture.md), and [docs/unit-model.md](docs/unit-model.md).
>
> Historical term translation:
> `Gatherer` -> `Mudpaw`
> `free specialist auto-deploy` -> obsolete; specialists are now Pearl blueprints trained in-match
> `Brawler / Sniper / Shieldbearer / Catapult` -> historical compatibility content, not the live player roster
>
> The roster matrices, progression beats, and matchup tables below are preserved for historical art and design context only. They should not be used as live gameplay, balance, or naming truth.

> **Historical note:** This design bible preserves older v1/v2 direction and art intent. It is not the canonical gameplay or unit-model spec for the current game. For the live model, use [docs/gameplay.md](docs/gameplay.md), [docs/architecture.md](docs/architecture.md), and [docs/unit-model.md](docs/unit-model.md).
>
> Historical term translation:
> `Gatherer` -> `Mudpaw`
> `free specialist auto-deploy` -> obsolete; specialists are now Pearl blueprints trained in-match
> `Brawler / Sniper / Shieldbearer / Catapult` -> historical compatibility content, not the live player roster
>
> The roster matrices, progression beats, and matchup tables below are preserved for historical art and design context only. They should not be used as live gameplay, balance, or naming truth.

## Vision

Warcraft II-style RTS in a pond ecosystem. Two playable factions compete for finite resources, territory, and survival. Long games with escalating threats, meaningful progression, and deep replayability. Campaign mode teaches the ropes; ranked play and cosmetic unlocks keep players coming back.

## Current State: v1.0.0

- **33 entity types** (10 player units, 8 enemies, 10 buildings, 3 resources, Commander, Frog, Fish)
- **25 techs** across 3 branches (Lodge, Armory, Nature) with active abilities
- **18 ECS systems** with spatial hash optimization + particle throttling
- **5 difficulty modes** + permadeath + custom game settings
- **Enemy evolution** (5 tiers over 45 minutes) + threat escalation (mega-waves, champions, random events)
- **5 campaign missions** with scripted dialogue, objectives, and settings overrides
- **2 playable factions** (Otter, Predator)
- **5 AI personalities** (Balanced, Turtle, Rush, Economic, Random)
- **7 commanders** with aura/passive bonuses and unlock progression
- **4 ranked tiers** (Bronze, Silver, Gold, Diamond) + leaderboard tracking
- **6 map scenarios** (Standard, Island, Contested, Labyrinth, River, Peninsula)
- **15 achievements** + 18 unlockables across 5 categories
- **Unit-specific SFX** (8 unique select sounds, building/death/tech/evolution effects)
- **Cosmetic system** with unit skins + building themes via sprite recoloring
- **2,500+ tests** across unit, browser, integration, gameplay, and E2E suites

## Macro Design (Strategic Layer)

### Win Conditions
- **Destruction Victory**: Destroy all enemy Predator Nests
- **Future**: Timed survival, economic victory, wonder victory

### Economic Pressure
- 4 resources: Clams (primary), Twigs (building), Pearls (elite tech), Food (population)
- Resources are FINITE and SHARED between factions
- Expansion is forced by depletion
- Fishing Huts provide passive income as economic safety net

### Difficulty Escalation
| Phase | Time | Threat |
|-------|------|--------|
| Peace | 0-2 min | Build economy, no combat |
| Early | 2-10 min | Gators + Snakes, basic waves |
| Mid | 10-20 min | Armored Gators, Venom Snakes (poison) |
| Late | 20-35 min | Swamp Drakes, Siege Turtles (anti-building) |
| Endgame | 35+ min | Alpha Predator (hero), mega-waves, continuous pressure |

## Meso Design (Tactical Layer)

### Army Composition
The damage multiplier table forces mixed armies:

| | Brawler | Sniper | Healer | Gator | Snake |
|---|---|---|---|---|---|
| Brawler | 1.0 | **1.5** | **1.5** | *0.75* | 1.0 |
| Sniper | *0.75* | 1.0 | **1.5** | 1.0 | **1.5** |
| Gator | **1.5** | *0.75* | 1.0 | 1.0 | 1.0 |
| Snake | 1.0 | **1.5** | 1.0 | 1.0 | *0.75* |

**Optimal compositions evolve over time:**
- Early: 3 Brawlers + 2 Snipers (covers basic threats)
- Mid: + Healer + Shieldbearer (sustain + tank)
- Late: + Catapult + Trapper (siege + crowd control)

### Base Layout
- Lodge at center with resource nodes nearby
- Burrows for housing expansion
- Towers at choke points
- Walls to funnel enemies
- Herbalist Hut near front line for area healing
- Fishing Hut for passive income

### Tech Tree Strategy
Three viable paths:
1. **Military Rush**: Sharp Sticks → Eagle Eye → Watchtower (ranged dominance)
2. **Economic Boom**: Tidal Harvest → Cartography → expand aggressively
3. **Utility Control**: Cunning Traps → Camouflage → Trapper army (debuff + stealth)

## Micro Design (Unit Control Layer)

### Veterancy
Units gain ranks from kills: Recruit → Veteran (3) → Elite (7) → Hero (15)
- Each rank provides HP/damage/speed bonuses
- Hero-rank units are 35% stronger across all stats
- Losing a Hero hurts more than losing 3 Recruits

### Formations
Multi-unit moves arrange into role-based rows:
- Front: Brawler, Shieldbearer (melee tanks)
- Middle: Sniper, Catapult (ranged DPS)
- Back: Healer, Gatherer, Trapper (support)

### Auto-Behaviors
6 toggleable automations for hands-off play:
- Gather, Build, Defend, Attack, Heal, Scout
- Contextual: only shows relevant options per idle unit type
- Auto-build uses pressure scoring (pop cap, military need, defense, expansion)

## Campaign System

5 guided missions with scripted Commander dialogue, per-frame objective tracking, and mission-specific settings overrides:

| # | Mission | Objectives | Key Settings |
|---|---------|-----------|--------------|
| 1 | **First Dawn** (Tutorial) | Build Armory, Train 3 Brawlers | Passive enemies, explored fog, rich resources |
| 2 | **Into the Fog** (Scouting) | Explore 50% map, Build second Lodge | Full fog, 1.5x starting resources |
| 3 | **The Nest Must Fall** (Offense) | Destroy 1 Enemy Nest | Aggressive enemies, 2 min peace |
| 4 | **Evolution** (Adaptation) | Survive to Evolution Tier 3 | Fast evolution (0.33x speed), 2 nests, island map |
| 5 | **Alpha Strike** (Boss Battle) | Defeat Alpha Predator | Full tech tree, max evolution, 3 nests, hero mode |

Campaign progress persists in SQLite. Missions unlock sequentially.

## Playable Factions

| Faction | Lodge | Melee | Ranged | Tank | Support | Siege | Hero |
|---------|-------|-------|--------|------|---------|-------|------|
| **Otter** | Lodge | Brawler | Sniper | Shieldbearer | Healer | Catapult | Commander |
| **Predator** | PredatorNest | Gator | VenomSnake | ArmoredGator | SwampDrake | SiegeTurtle | BossCroc |

Each faction has its own tech tree subset. Choosing a faction makes the other AI-controlled.

## AI Personalities

| Personality | Attack Threshold | Tower Rate | Expansion | Training Bias |
|-------------|-----------------|------------|-----------|---------------|
| **Balanced** | 1.0x | 1.0x | 1.0x | Mixed |
| **Turtle** | 2.0x (waits) | 2.5x | 0.5x | Ranged |
| **Rush** | 0.3x (attacks early) | 0.5x | 0.2x | Melee |
| **Economic** | 1.5x | 0.5x | 2.0x | Mixed |
| **Random** | Switches between above every 5 min | | | |

## Commander System

7 unlockable commanders with aura and passive bonuses:

| Commander | Aura Bonus | Passive Bonus | Unlock |
|-----------|-----------|---------------|--------|
| **Marshal** | +10% damage | None | Default |
| **Sage** | +25% research speed | +15% gather rate | Win 3 games |
| **Warden** | +200 HP to buildings | Towers +20% attack speed | Win on Hard |
| **Tidekeeper** | +0.3 speed | Swimmers cost 50% less | Collect 200 pearls |
| **Shadowfang** | Enemies -15% damage | Trapper traps 2x duration | Win with 0 losses |
| **Ironpaw** | +20% HP to units | Shieldbearers trained 2x faster | 5 Hero units |
| **Stormcaller** | Catapults +50% range | Random lightning | Win on Nightmare |

## Leaderboards & Ranked Progression

| Rank | Wins Required | Badge Color |
|------|--------------|-------------|
| **Bronze** | 0-4 | Copper |
| **Silver** | 5-14 | Silver |
| **Gold** | 15-29 | Gold |
| **Diamond** | 30+ | Ice blue |

Tracks: total wins/losses, total kills, fastest win, longest survival, total playtime, highest difficulty won, current/best win streak. All data persisted in SQLite player_profile table.

## Map Scenarios

| Scenario | Description | Strategic Flavor |
|----------|-------------|-----------------|
| **Standard** | Open map, balanced resources | General purpose |
| **Island** | Surrounded on all sides | Defensive |
| **Contested** | Start close to enemy | Aggressive |
| **Labyrinth** | Maze walls, dead-end resources | Favors Trappers |
| **River** | Vertical divide with bridge choke points | Favors Swimmers |
| **Peninsula** | Narrow walled land, single entry | Ultimate turtle map |

## Cosmetic System

Sprite recoloring system with HSL transforms provides visual customization:
- 14 recolor presets (veteran, elite, hero, champion, enraged, poisoned, shielded, 7 commander variants)
- 6 unit skins + 4 building themes unlockable through gameplay
- Per-kind exclusivity, persisted in SQLite

## Unlocks & Achievements

**15 achievements** tracking milestones from "First Blood" (1 kill) through "Nightmare Survivor" (win on Nightmare). Checked every 30 seconds and on game-over, persisted in SQLite.

**18 unlockables** across 5 categories:
- 2 scenario unlocks (Island, Contested)
- 5 preset unlocks (Sandbox, Speedrun, Survival, Nightmare, Ultra Nightmare)
- 4 unit unlocks (Catapult, Swimmer, Trapper, Shieldbearer)
- 3 modifier unlocks (Hero Mode, Permadeath, Fast Evolution)
- 2 cosmetic unlocks (Gold Commander Cape, Red War Banner)

## Longevity Roadmap

### Phase 1: Engagement Hooks -- COMPLETE
- ~~Achievements system~~ -- 15 milestones with SQLite persistence
- ~~Campaign tutorial~~ -- 5 guided missions with scripted dialogue + objectives
- ~~Improved new-player onboarding~~ -- Commander tutorial system, accessibility settings (UI scale, screen shake toggle, reduce noise)

### Phase 2: Content Depth -- COMPLETE
- ~~Predator faction~~ -- Play as the enemy with mirrored unit roster
- ~~Map scenarios~~ -- 6 total (Standard, Island, Contested, Labyrinth, River, Peninsula)
- ~~Custom game settings~~ -- 13 configurable options (resource density, peace timer, fog of war, hero mode, etc.)

### Phase 3: Competitive -- COMPLETE
- ~~Leaderboards~~ -- Personal bests, win streaks, ranked progression (Bronze/Silver/Gold/Diamond)
- ~~Ranked difficulty ladder~~ -- 5 difficulty modes with permadeath option
- ~~Cosmetic unlocks~~ -- Unit skins + building themes via sprite recoloring
- ~~Advanced AI personalities~~ -- 5 types (Balanced, Turtle, Rush, Economic, Random)
