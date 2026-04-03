# Gameplay Design (v3)

## Overview

Pond Warfare is a mobile-first real-time strategy game set in a pond ecosystem. The player controls a colony of otters defending their Lodge from escalating waves of predators. There is one game mode: defend the Lodge. Between matches, the player spends earned Clams on a deep upgrade web and Pearls on prestige upgrades.

The core loop: PLAY -> EARN CLAMS -> UPGRADE -> PLAY HARDER -> PRESTIGE -> REPEAT.

## Game Mode: Defend the Lodge

Each match takes place on a vertical map. The player's Lodge sits at the bottom. Resources spawn in the middle zone. Enemies attack from the top. The match progresses through increasingly difficult events until the Lodge falls (lose) or all events are cleared (win).

### Win/Lose Conditions

- **Win**: Survive all match events (waves, bosses, etc.)
- **Lose**: Lodge HP reaches 0

### Match Flow

1. Match starts with Lodge + initial units at bottom of vertical map
2. Player gathers resources (Fish, Rocks, Logs), trains units, builds fortifications
3. Events trigger on a timer (waves, boss fights, sabotage raids, etc.)
4. Player defends Lodge, completes events for bonus Clam rewards
5. Match ends -> Rewards Screen calculates Clam earnings
6. Return to main menu -> spend Clams on upgrades, optionally prestige

## Resources

### In-Match Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Fish** | Fish nodes (Clambed) | Training generalist units |
| **Rocks** | Rock deposits (PearlBed) | Building fortifications |
| **Logs** | Tree clusters (Cattail) | Building construction, repairs |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from completed Lodges (+8) and Burrows (+6).

Resources are finite. When a node is depleted, it is gone -- forcing expansion toward fresh nodes. Both factions compete for the same resource nodes.

### Metagame Currencies

| Currency | Source | Used For |
|----------|--------|----------|
| **Clams** | Earned post-match | Upgrade web purchases (240+ nodes) |
| **Pearls** | Earned from prestige (Rank Up) | Pearl upgrades (auto-deploy, auto-behaviors, multipliers) |

## Vertical Map

Maps are vertical: approximately one screen wide and 2-3 screens tall.

- **Bottom 15%**: Lodge zone -- player Lodge + initial buildings
- **20% to 65%**: Resource zone -- fish nodes, rock deposits, tree clusters
- **Top 15%**: Enemy spawn zone -- waves arrive from here

Map dimensions scale with progression level (from `configs/terrain.json`):

| Progression | Map Size | Resource Nodes | Enemy Spawn Directions |
|-------------|----------|----------------|------------------------|
| Level 0-10 | 1600x2400 | 6 | Top only |
| Level 11-30 | 2000x3000 | 10 | Top, left, right |
| Level 31+ | 2400x3600 | 15 | Top, left, right, flanking |

### Terrain

| Type | Speed Mult | Notes |
|------|-----------|-------|
| Grass | 1.0 | Standard movement |
| Water | 0 (impassable) | Water units bypass |
| Rocks | 0 (impassable) | Blocks all movement |
| Mud | 0.75 | Slowed movement |

## Units

### Player Generalists (4)

Trainable at the Lodge during a match. These are the core units available from the start.

| Unit | HP | Speed | Damage | Cost (Fish) | Role |
|------|----|-------|--------|-------------|------|
| **Gatherer** | 30 | 2.0 | 0 | 10 | Collects resources, constructs buildings |
| **Fighter** | 60 | 1.8 | 8 | 20 | Melee combat unit |
| **Medic** | 25 | 1.5 | 0 | 15 | Heals nearby wounded allies |
| **Scout** | 20 | 3.5 | 1 | 8 | Fast recon, reveals fog of war |

### Player Specialists (10)

Unlocked via upgrade web diamond nodes and auto-deployed at match start via prestige Pearl upgrades. Specialists cannot be trained during a match -- they are permanent automated units.

| Unit | HP | Speed | Damage | Role | Auto-Target |
|------|----|-------|--------|------|-------------|
| **Fisher** | 25 | 2.0 | 0 | Auto-gathers fish | Nearest fish node |
| **Digger** | 25 | 1.8 | 0 | Auto-gathers rocks | Nearest rock deposit |
| **Logger** | 25 | 1.8 | 0 | Auto-gathers logs | Nearest tree cluster |
| **Guardian** | 80 | 1.2 | 6 | Auto-defends Lodge area | Lodge perimeter |
| **Hunter** | 50 | 2.0 | 10 | Auto-attacks nearest enemy | Closest threat |
| **Ranger** | 40 | 2.5 | 6 | Auto-patrols routes | Patrol waypoints |
| **Shaman** | 20 | 1.5 | 0 | Auto-heals wounded | Nearest wounded ally |
| **Lookout** | 15 | 3.0 | 0 | Auto-scouts fog edges | Fog of war boundary |
| **Sapper** | 40 | 1.5 | 15 | Siege enemy fortifications | Enemy forts |
| **Saboteur** | 30 | 2.5 | 5 | Subverts enemy resource nodes | Enemy resource nodes |

### Enemy Units (6)

Enemy units scale with progression level: HP +5%/level, Damage +3%/level, Speed +1%/level. All stats in `configs/enemies.json`.

| Unit | HP | Speed | Damage | Role |
|------|----|-------|--------|------|
| **Raider** | 25 | 2.5 | 4 | Targets player resource nodes |
| **Fighter** | 60 | 1.8 | 8 | Direct assault on Lodge and units |
| **Healer** | 20 | 1.5 | 0 | Restores wounded enemy allies |
| **Scout (enemy)** | 15 | 3.0 | 1 | Reveals player army composition |
| **Sapper (enemy)** | 50 | 1.0 | 20 | Destroys fortifications and walls |
| **Saboteur (enemy)** | 25 | 2.5 | 3 | Poisons player resource nodes |

## Fortifications

Built by Gatherers using Rocks. Placed around the Lodge perimeter. Fort slot count scales with progression level.

| Fortification | HP | Cost (Rocks) | Effect |
|---------------|----|-------------|--------|
| **Wood Wall** | 100 | 15 | Blocks enemy movement |
| **Stone Wall** | 250 | 40 | Reinforced barrier, higher HP |
| **Watchtower** | 150 | 30 | Auto-attacks enemies (5 dmg, 200 range) |
| **Siege Tower** | 200 | 60 | Heavy fire platform (15 dmg, 300 range) |

Fort slots per progression level: 4 (level 0-9), 8 (level 10-29), 12 (level 30+).

## Lodge

The central building. If it falls, the match is lost.

- **Base HP**: 500 (scales with upgrades)
- **Wings**: Visual attachments unlocked via upgrade web diamond nodes:
  - Dock Wing (Gathering category tier 5) -- faster fish gathering
  - Barracks Wing (Combat category tier 5) -- faster unit training
  - Watchtower Wing (Defense category tier 5) -- early wave warning
  - Healing Pool Wing (Utility category tier 5) -- units near Lodge heal
- **Prestige glow**: Visual effect based on prestige rank

## Match Events

Events are the primary challenge mechanic, replacing the old wave system. Defined in `configs/events.json` with min/max progression level requirements.

### Event Types

| Event | Description | Reward (Clams) |
|-------|-------------|----------------|
| **Basic Wave** | Fighters and raiders approach | 5 |
| **Raider Wave** | Raiders target resource nodes | 4 |
| **Heavy Assault** | Fighters with wall-breaker sappers | 8 |
| **Healer Squad** | Enemy healers support assault | 7 |
| **Scout Incursion** | Enemy scouts probe defenses | 3 |
| **Sabotage Raid** | Saboteurs corrupt resource nodes | 6 |
| **Boss Croc** | Boss enemy with massive HP | 15 |
| **Alpha Predator** | Elite boss with damage aura | 20 |
| **Storm Event** | Reduced visibility, slowed units | 5 |
| **Escort Mission** | Protect a VIP crossing the map | 10 |
| **Swarm** | Many small enemies rush the Lodge | 6 |
| **Mega Boss** | Enormous boss, late-game only | 25 |
| **Resource Surge** | Bonus resource nodes appear | 3 |

### Event Timing

- **First event delay**: 30 seconds (configurable per event type)
- **Interval**: 45-90 seconds between events (randomized via PRNG)
- **Max concurrent**: 2 events active simultaneously
- **Progression filter**: Events only appear if player meets min/max progression level

## Upgrade Web

Between matches, the player spends earned Clams on permanent upgrades arranged in a web of 240+ nodes.

### Structure

- **6 categories**: Gathering, Combat, Defense, Utility, Economy, Siege
- **4 subcategories each**: e.g., Gathering has Fish Gathering, Rock Gathering, Log Gathering, Carry Capacity
- **10 tiers per subcategory**: Each tier costs more but gives a larger bonus
  - Cost formula: `base_cost * 2^tier` (exponential scaling)
  - Effect formula: `base_effect * (tier + 1)` (linear stat increase)

### Upgrade Categories

| Category | Subcategories | Effect Examples |
|----------|---------------|-----------------|
| **Gathering** | Fish, Rock, Log, Carry Capacity | +5% gather rate per tier |
| **Combat** | Attack Power, Attack Speed, Armor, Critical Hit | +5% attack per tier |
| **Defense** | Wall HP, Tower Damage, Lodge HP, Repair Speed | +10% wall HP per tier |
| **Utility** | Unit Speed, Vision Range, Heal Power, Train Speed | +3% speed per tier |
| **Economy** | Node Yield, Gather Radius, Unit Cost Reduction, Clam Bonus | +5% yield per tier |
| **Siege** | Siege Damage, Siege Range, Sapper Speed, Demolish Power | +5% siege per tier |

### Diamond Nodes

Cross-category milestone nodes that unlock major features:

- **Lodge wings**: Reaching tier 5 in a category unlocks a Lodge wing (visual + gameplay effect)
- **Specialist unlocks**: Reaching specific tier combinations unlocks new specialist types
- **Auto-behavior unlocks**: Reaching milestones enables new automated behaviors

Diamond nodes have multi-path requirements (e.g., "Gathering tier 5 AND Economy tier 3").

### Tier Prefixes

Upgrades are named procedurally: "{Prefix} {Subcategory}". Prefixes by tier:

| Tier | Prefix |
|------|--------|
| 0 | Basic |
| 1 | Improved |
| 2 | Advanced |
| 3 | Superior |
| 4 | Expert |
| 5 | Master |
| 6 | Grandmaster |
| 7 | Legendary |
| 8 | Mythic |
| 9 | Ultimate |

Example: "Expert Fish Gathering" (tier 4 of Fish Gathering subcategory).

## Prestige System

When the player reaches a progression threshold, they can **Rank Up** (prestige):

1. All Clam upgrade progress is reset
2. Player earns Pearls: `floor(progression_level * 0.5)`
3. Pearls are spent on permanent upgrades that persist across prestiges

### Pearl Upgrades

Three categories of Pearl upgrades:

#### Auto-Deploy (specialists at match start)
- Auto-Deploy Fisher (3 Pearls/rank, max 5)
- Auto-Deploy Digger (3 Pearls/rank, max 5)
- Auto-Deploy Logger (3 Pearls/rank, max 5)
- Auto-Deploy Guardian (5 Pearls/rank, max 3)
- Auto-Deploy Hunter (5 Pearls/rank, max 3)
- Auto-Deploy Ranger (4 Pearls/rank, max 3)
- Auto-Deploy Shaman (4 Pearls/rank, max 3)
- Auto-Deploy Lookout (3 Pearls/rank, max 3)
- Auto-Deploy Sapper (5 Pearls/rank, max 2)
- Auto-Deploy Saboteur (4 Pearls/rank, max 2)

#### Auto-Behaviors (permanent passives)
- Auto-Gather (2 Pearls) -- gatherers auto-collect
- Auto-Defend (3 Pearls) -- combat units auto-patrol
- Auto-Heal (2 Pearls) -- medics auto-heal wounded

#### Multipliers (permanent stat boosts)
- Gather Speed +10%/rank (2 Pearls/rank, max 5)
- Unit HP +5%/rank (3 Pearls/rank, max 5)
- Attack Damage +5%/rank (3 Pearls/rank, max 5)

## Post-Match Rewards

After each match, the Rewards Screen shows earned Clams:

**Formula**: `(base + kill_bonus + event_bonus + survival_bonus) * prestige_multiplier`

| Component | Value |
|-----------|-------|
| Base Clams | 10 (always earned) |
| Kill Bonus | 1 per enemy killed |
| Event Bonus | 5 per event completed |
| Survival Bonus | 2 per minute survived |
| Prestige Multiplier | 1.0 + (rank * 0.1) |
| Loss Penalty | 50% of total |

### Rank Up Eligibility

Rank Up becomes available when `progression_level >= rank_threshold_base * (1 + current_rank * 0.5)`. Base threshold is 20.

## Combat Mechanics

- **Auto-aggro**: Idle combat units engage enemies within aggro radius (200px player, 250px enemy)
- **Retaliation**: Units under attack fight back (gatherers flee first)
- **Ally assist**: Nearby idle allies join combat within 300px
- **Towers/Watchtowers**: Auto-target nearest enemy within range
- **Formation movement**: Group move commands arrange units by role (melee front, ranged middle, support back)

## Veterancy System

Combat units gain experience from kills and rank up with cumulative stat bonuses.

| Rank | Kills | HP Bonus | Damage Bonus | Speed Bonus |
|------|-------|----------|--------------|-------------|
| Recruit | 0 | -- | -- | -- |
| Veteran | 3 | +10% | +15% | -- |
| Elite | 7 | +20% | +25% | +10% |
| Hero | 15 | +35% | +40% | +15% |

## Weather System

Changes every 3-5 minutes, seeded from map seed for determinism:

| Weather | Effect |
|---------|--------|
| **Clear** | No modifiers |
| **Rain** | -15% speed on grass, shallows become impassable |
| **Fog** | -40% vision range, enemies wait longer to attack |
| **Wind** | +-15px projectile drift |

## Auto-Behaviors

Toggled via the radial menu on the idle worker button:

| Behavior | Applies To | Effect |
|----------|-----------|--------|
| Auto-Gather | Idle Gatherers | Seek nearest resource node |
| Auto-Build | Idle Gatherers | Pressure-based building decisions |
| Auto-Defend | Idle Combat | Patrol near Lodge |
| Auto-Attack | Idle Combat | Attack-move toward nearest enemy |
| Auto-Heal | Idle Medics | Seek nearest wounded ally |
| Auto-Scout | Idle Scouts | Move to unexplored map areas |

## Day/Night Cycle

- Time advances each frame, wrapping at 24 hours
- Ambient darkness calculated from time palette
- Night reduces visibility range
- Fireflies appear during dark periods

## Fog of War

- Unexplored areas of the map are hidden
- Player units and buildings reveal a circle around their position
- Previously explored areas remain dimly visible but don't show current enemies
- Scouting is essential to locate resource nodes and incoming attacks

## Kill Streaks

Rapid consecutive kills within 5 seconds trigger announcements:

| Kills | Name | Effect |
|-------|------|--------|
| 3 | TRIPLE KILL | Gold floating text, screen shake |
| 5 | RAMPAGE | Red floating text, heavy screen shake |

## Sound Design

Unit-specific SFX via Tone.js synthesis with spatial stereo panning. Effects include building placement, research complete, train complete, unit death, building destruction, heal, and error sounds. Music adapts between peaceful and combat states.

## Difficulty

The game scales difficulty through progression level, not an explicit difficulty selector. Higher progression means:
- Larger maps with more spawn directions
- More events with tougher enemy compositions
- Enemies with scaled HP, damage, and speed
- More resource nodes but more to defend
