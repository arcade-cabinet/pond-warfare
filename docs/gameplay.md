# Gameplay Design

## Overview

Pond Warfare is a Warcraft II-style real-time strategy game set in a pond ecosystem. Two factions -- otters and predators -- compete for the same finite resource nodes, build economies, train armies, and fight for map control. The enemy AI runs its own economy with gatherers, funds army production from collected resources, and makes strategic attack decisions. An enemy evolution system progressively unlocks stronger predator types over time, forcing the player to adapt.

## Factions

| Faction | Units | Role |
|---------|-------|------|
| **Player** (Otters) | Gatherer, Brawler, Sniper, Healer, Shieldbearer, Scout, Catapult, Swimmer, Trapper | Build, gather, fight |
| **Enemy** (Predators) | Gator, Snake, ArmoredGator, VenomSnake, SwampDrake, SiegeTurtle, AlphaPredator, BossCroc | Gather, build, fight |
| **Neutral** | Cattail, Clambed, PearlBed | Harvestable resources (shared) |

Both factions harvest from the same neutral resource nodes. The enemy AI spawns its own gatherers from Predator Nests and collects resources into its own stockpile (`enemyResources` in GameWorld).

## Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Clams** | Clambed nodes (4,000 each) | Units, buildings, tech |
| **Twigs** | Cattail nodes (400 each) | Buildings, tech |
| **Pearls** | PearlBed nodes (500 each) | Elite techs (Hardened Shells, Siege Works, etc.) |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from completed Lodges (+8), Burrows (+6), and Fishing Huts (+2).

### Resource Scarcity

Resources are finite and shared between factions. Both player and enemy gatherers harvest from the same clam beds, cattail nodes, and pearl beds. When a node is depleted, it's gone -- forcing expansion to control new resource areas. Strategic resource denial (harvesting nodes near the enemy, or defending key nodes) is a core part of gameplay. Pearls are a rare third resource required for elite technologies, adding another dimension to expansion decisions.

## Expansion

Players can build multiple Lodges across the map. Each Lodge:
- Provides +8 population cap
- Serves as a resource drop-off point for gatherers
- Can train Gatherers and research Lodge-tier tech

Expanding to new Lodges near fresh resource nodes is essential as nearby deposits deplete. Losing a Lodge reduces your population cap and economy.

## Buildings

| Building | Cost | Provides |
|----------|------|----------|
| **Lodge** | 200C 150T | Trains Gatherers, +8 food cap, tech research, resource drop-off |
| **Burrow** | 75T | +6 food cap |
| **Armory** | 180C 120T | Trains Brawler/Sniper/Healer/Shieldbearer/Catapult, combat tech |
| **Tower** | 200C 250T | Auto-attack turret (200px range, 10 damage) |
| **Watchtower** | 400C 350T | Long-range turret (280px, 15 damage, requires Eagle Eye) |
| **Wall** | 50T | Passive barrier (400 HP) |
| **Scout Post** | 100C 75T | Reveals fog of war in large radius |
| **Fishing Hut** | 100C 75T | Passive food income, +2 food cap |
| **Herbalist Hut** | 150C 100T | Area heal for nearby friendly units |

Buildings start at 1 HP and must be constructed by Gatherers. Progress shown as percentage.

## Units

### Player Units

| Unit | HP | Speed | Damage | Range | Cost |
|------|----|----|--------|-------|------|
| **Gatherer** | 30 | 2.0 | 2 | 40 | 50C 1F |
| **Brawler** | 60 | 1.8 | 6 | 40 | 100C 50T 1F |
| **Sniper** | 40 | 1.6 | 8 | 180 | 80C 80T 1F |
| **Healer** | 25 | 1.8 | 0 | - | 80C 60T 1F |
| **Shieldbearer** | 100 | 1.4 | 3 | 35 | 150C 100T 1F |
| **Scout** | 20 | 3.0 | 1 | 30 | 50C 1F |
| **Catapult** | 50 | 0.8 | 20 | 250 | 300C 200T 1F |
| **Swimmer** | 35 | 2.8 | 4 | 40 | 60C 30T 1F |
| **Trapper** | 30 | 1.6 | 0 | 100 | 80C 60T 1F |

**Swimmer** is a fast amphibious unit ideal for flanking and raiding. **Trapper** places speed debuff traps that slow enemies passing through them. **Shieldbearer** is a high-HP tank that absorbs damage for squishier units. **Catapult** deals devastating siege damage from extreme range but is slow and fragile.

### Enemy Units

| Unit | HP | Speed | Damage | Range | Special |
|------|----|----|--------|-------|---------|
| **Gator** | 60 | 1.8 | 6 | 40 | Basic melee, available from start |
| **Snake** | 60 | 2.0 | 4 | 40 | Fast melee, available from start |
| **Armored Gator** | 120 | 1.0 | 8 | 40 | Tanky melee, evolution tier 1 |
| **Venom Snake** | 40 | 2.2 | 3 | 40 | Poison DoT (2 damage/sec), evolution tier 2 |
| **Swamp Drake** | 50 | 2.0 | 6 | 60 | Fast flanker, strong vs Gatherers, evolution tier 3 |
| **Siege Turtle** | 300 | 0.5 | 25 | 50 | Anti-building (3x vs buildings), evolution tier 4 |
| **Alpha Predator** | 500 | 1.0 | 12 | 50 | Damage aura (+20% to nearby enemies), evolution tier 5 |
| **Boss Croc** | 200 | 1.2 | 15 | 50 | AoE stomp, enrage at 30% HP |

### Enemy Evolution System

The enemy faction evolves, unlocking progressively stronger unit types as the game progresses. Evolution only begins after the peace period ends.

| Tier | Minutes After Peace | Unit Unlocked | Threat Profile |
|------|-------------------|---------------|----------------|
| 0 | Start | Gator + Snake | Base enemies |
| 1 | 5 min | Armored Gator | Tanky melee, difficult to defeat with light units |
| 2 | 10 min | Venom Snake | Poison DoT drains HP over time (2 dmg/sec for several ticks) |
| 3 | 15 min | Swamp Drake | Fast flanker, bypasses front line to hit gatherers |
| 4 | 25 min | Siege Turtle | Anti-building specialist (3x damage vs buildings) |
| 5 | 40 min | Alpha Predator | Hero enemy with +20% damage aura for nearby allies |

Evolution is checked every 600 frames (10 seconds). When a new tier triggers, a red warning message appears and the screen shakes. The evolution system also manages poison tick damage from Venom Snakes and the Alpha Predator damage aura.

## Unit Counter System

A damage multiplier table creates rock-paper-scissors dynamics between unit types. Multipliers above 1.0 mean the attacker is strong against that defender; below 1.0 means weak. Unlisted matchups default to 1.0 (neutral).

| Attacker | Strong vs (1.5x) | Weak vs (0.75x) |
|----------|-------------------|------------------|
| **Brawler** | Sniper, Healer | Gator |
| **Sniper** | Healer, Snake | Brawler |
| **Gator** | Brawler | Sniper |
| **Snake** | Sniper | Brawler |
| **Shieldbearer** | Sniper (1.5x) | Gator (0.75x) |
| **Armored Gator** | Brawler (1.5x) | Sniper (0.75x) |
| **Venom Snake** | Sniper (1.5x) | Brawler (0.75x) |
| **Swamp Drake** | Gatherer (1.5x) | Shieldbearer (0.75x) |
| **Siege Turtle** | Buildings (3x in combat) | Brawler (0.5x) |
| **Alpha Predator** | Brawler (1.25x), Sniper (1.25x) | -- |

Boss Croc has no counter multipliers -- it deals full damage to all targets.

This system rewards army composition decisions: a pure Brawler army will struggle against Gators, while mixing in Snipers creates a balanced force. As evolved enemies appear, players must further diversify their army to handle new threats.

## Formation Movement

When multiple units are selected and given a move command, they arrange into role-based formation rows:

| Row | Position | Unit Types |
|-----|----------|------------|
| **Front** | Closest to target | Brawler, Gator (melee) |
| **Middle** | One row back | Sniper (ranged) |
| **Back** | Furthest from target | Healer, Gatherer (support) |

Each row is centered horizontally with 40px spacing between units. Formation movement uses Yuka.js AlignmentBehavior and CohesionBehavior for coordinated flocking, keeping the group together while each unit seeks its individual formation position.

## Veterancy System

Combat units gain experience from kills and rank up with cumulative stat bonuses. Rank-ups are announced with floating text and gold particle effects.

| Rank | Kills Required | HP Bonus | Damage Bonus | Speed Bonus |
|------|---------------|----------|--------------|-------------|
| **Recruit** | 0 | -- | -- | -- |
| **Veteran** | 3 | +10% | +15% | -- |
| **Elite** | 7 | +20% | +25% | +10% |
| **Hero** | 15 | +35% | +40% | +15% |

Bonuses are percentages of the unit's base stats. For example, a Brawler (base 60 HP, 6 damage) at Hero rank has 81 HP and 8 damage. The veterancy system checks every 60 frames and applies incremental bonuses when a new rank threshold is crossed.

## Enemy AI

The enemy faction runs a full parallel economy and makes strategic decisions.

### Economy

- **Starting resources**: 500 clams, 200 twigs
- **Gatherer spawning**: Every 1200 frames (~20s), each Predator Nest spawns an enemy gatherer if it can afford one (50C) and has fewer than 3 gatherers nearby
- **Resource collection**: Enemy gatherers seek the nearest resource node, harvest, and return resources to their nest
- **Shared resource nodes**: Both factions compete for the same clam beds and cattails

### Building Construction

The AI checks every 1800 frames (~30s) what to build, prioritizing:

1. **Tower** (200C 250T) - if no tower near a nest, build one for defense
2. **Burrow** (100T) - if no burrow near a nest, build one for food cap
3. **Expansion Nest** (400C 300T) - if fewer than 3 nests exist, expand

Buildings are placed within 200px of an existing nest on the tile grid.

### Army Training

Every 300 frames (~5s), each nest queues combat units (max 3 in queue, 240 frames per unit):

| Unit | Cost | Counter-picks |
|------|------|---------------|
| **Gator** | 100C 50T | Trained more when player has many Brawlers |
| **Snake** | 80C 30T | Trained more when player has many Snipers |

The AI analyzes the player's army composition and adjusts its Gator/Snake ratio to exploit the damage multiplier table.

### Attack Decision-Making

Every 600 frames (~10s), the AI checks if its army exceeds the attack threshold (5 units). If so:

1. Identifies the weakest player building as the target
2. Groups idle army units near the rally point
3. Sends them as a coordinated attack-move

### Retreat and Scouting

- **Retreat**: Every 60 frames, combat units below 20% HP disengage and move toward the nearest nest
- **Scouting**: Every 3600 frames (~60s), a scout Snake is spawned and sent to explore, biased 70% toward the player Lodge area

## Tech Tree

Researched at the Lodge or Armory. 15 technologies across three branches: Lodge (economy/defense), Armory (military), and Nature (new units/support). Some techs require Pearls.

### Lodge Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Sturdy Mud** | 200C 300T | +300 HP to all player buildings | -- |
| **Swift Paws** | 300C 250T | +0.4 speed to all player units | Sturdy Mud |
| **Cartography** | 150C 100T | Unlocks Scout Post, +25% fog reveal | -- |
| **Tidal Harvest** | 200C 150T | Gatherers collect +50% resources | -- |

### Armory Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Sharp Sticks** | 300C 200T | +2 damage to all combat units | -- |
| **Eagle Eye** | 400C 300T | +50 range for snipers | Sharp Sticks |
| **Hardened Shells** | 500C 400T 30P | +5 HP regen for all units | Eagle Eye |
| **Iron Shell** | 300C 200T | Unlocks Shieldbearer unit | Sharp Sticks |
| **Siege Works** | 400C 350T 50P | Unlocks Catapult unit | Eagle Eye |
| **Battle Roar** | 350C 250T | +10% attack speed for all units | Sharp Sticks |
| **Cunning Traps** | 200C 150T | Unlocks Trapper (speed debuff traps) | Sharp Sticks |
| **Camouflage** | 300C 200T | Blend into reeds, strike unseen | Cunning Traps |

### Nature Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Herbal Medicine** | 100C 80T | Ancient pond remedies heal nearby wounded | -- |
| **Aquatic Training** | 150C 100T | Unlocks Swimmer (amphibious warfare) | Herbal Medicine |
| **Deep Diving** | 200C 150T | +30% pearl gathering rate | Aquatic Training |

## Difficulty Modes

The game offers five difficulty settings that affect enemy economy speed, army size, aggression, and overall challenge.

| Difficulty | Effect |
|------------|--------|
| **Easy** | Slower enemy eco, smaller waves |
| **Normal** | Default balance |
| **Hard** | Faster enemy eco, larger waves |
| **Nightmare** | Aggressive AI, rapid evolution |
| **Ultra Nightmare** | Maximum difficulty, relentless pressure |

Difficulty is set at game start and stored in `world.difficulty`.

## Permadeath Mode

An optional mode for high-stakes gameplay:
- **+50% resources** from all gathering (compensates for no second chances)
- **+25% XP** for veterancy progression
- **Save deleted on loss** -- if you lose, the save file is erased
- Tracked via `world.permadeath` and `world.rewardsModifier` (1.5 with permadeath, 1.0 without)

## Auto-Build System

When auto-build is enabled (via the idle radial menu), the system evaluates build pressures every 300 frames (~5 seconds) and assigns an idle gatherer to construct the highest-priority affordable building near the player Lodge.

### Pressure Scoring

| Score | Condition | Building |
|-------|-----------|----------|
| **120** (CRITICAL) | Under attack, no tower | Tower |
| **100** (CRITICAL) | Population cap reached | Burrow |
| **80** (HIGH) | No armory, peace ending | Armory |
| **60** (MEDIUM) | Nearby resources depleting | Lodge |

Only affordable buildings are considered. The system finds a valid tile position in expanding rings around the Lodge and sends an idle gatherer to build.

## Kill Streaks

Rapid consecutive kills within a 5-second window (300 frames) trigger streak announcements:

| Kills | Name | Effect |
|-------|------|--------|
| 3 | **TRIPLE KILL** | Gold floating text, screen shake (8 frames) |
| 5 | **RAMPAGE** | Red floating text, heavy screen shake (15 frames) |

Kill streaks reset when the 5-second window between kills expires.

## Combat Mechanics

- **Auto-aggro**: Idle combat units engage enemies within aggro radius every 30 frames (player: 200px, enemy: 250px)
- **Retaliation**: Units under attack fight back (gatherers flee first for 1.5s)
- **Ally assist**: Nearby idle allies join combat within 300px
- **Attack-move patrol**: Units scan for enemies every 15 frames while moving
- **Towers**: Auto-target nearest enemy within range, fire projectiles
- **Damage multipliers**: Applied to both melee and ranged attacks based on the counter table
- **Healer auto-follow**: Idle healers seek nearest wounded ally within 150px

## Fog of War

- Unexplored areas of the map are hidden
- Player units and buildings reveal a circle around their position
- Buildings reveal a larger area (radius 16) than units (radius 10) on the explored canvas
- Previously explored areas remain dimly visible but don't show current enemy positions
- Scouting is essential to locate enemy nests, resource nodes, and incoming attacks

## Wave System

- **Peace period**: 180 seconds (10,800 frames) at game start
- **Wave interval**: Every 30 seconds (1,800 frames) after peace ends
- **Wave scaling**: `min(6, 1 + floor(elapsed / 7200))` units per nest
- **Boss waves**: After wave 10, Boss Croc spawns every 3 wave intervals
- **Nest defense**: Damaged nests (<50% HP) spawn defenders every 10 seconds

## Auto-Behaviors (Idle Radial Menu)

Toggled via the radial menu on the idle worker button:

| Behavior | Applies To | Effect |
|----------|-----------|--------|
| **Auto-Gather** | Idle Gatherers | Seek nearest resource with remaining amount |
| **Auto-Build** | Idle Gatherers | Pressure-based building decisions (see Auto-Build System above) |
| **Auto-Defend** | Idle Combat | Wander-patrol near Lodge using Yuka steering |
| **Auto-Attack** | Idle Combat | Attack-move toward nearest enemy |
| **Auto-Heal** | Idle Healers | Seek nearest wounded ally |
| **Auto-Scout** | Idle fast units | Move to random unexplored map areas |

## Win/Lose Conditions

- **Win**: All Predator Nests destroyed
- **Lose**: Player Lodge destroyed (any Lodge -- if all are destroyed)
- **Rating**: 1-3 stars based on time survived and kill ratio

## Day/Night Cycle

- Time advances at 0.05 minutes per frame, wrapping at 24 hours (1440 minutes)
- Ambient darkness calculated from TIME_STOPS color palette
- Fireflies appear during dark periods
- Night reduces visibility range
