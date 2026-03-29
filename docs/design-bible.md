# Pond Warfare - Game Design Bible

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
- **Unit-specific SFX** (8 unique select sounds, building/death/tech/airdrop effects)
- **Cosmetic system** with unit skins + building themes via sprite recoloring
- **359 tests** across 29 files

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

## Longevity Roadmap

### Phase 1: Engagement Hooks (next)
- Achievements system (25-30 milestones)
- Campaign tutorial (5 guided missions)
- Replay playback UI
- Improved new-player onboarding

### Phase 2: Content Depth
- Predator faction (play as the enemy)
- Procedural map scenarios (island, crater, coral reef)
- Extended campaign (10+ missions)
- Seasonal challenges

### Phase 3: Competitive
- Leaderboards (time survived, kills, win streak)
- Ranked difficulty ladder
- Cosmetic unlocks (unit skins, building themes)
- Advanced AI personalities (aggressive, turtle, rush)
