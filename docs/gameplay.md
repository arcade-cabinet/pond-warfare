# Gameplay Design

## Overview

Pond Warfare is a Warcraft II-style real-time strategy game set in a pond ecosystem. Two factions -- otters and predators -- compete for the same finite resource nodes, build economies, train armies, and fight for map control. The enemy AI runs its own economy with gatherers, funds army production from collected resources, and makes strategic attack decisions.

## Factions

| Faction | Units | Role |
|---------|-------|------|
| **Player** (Otters) | Gatherer, Brawler, Sniper, Healer | Build, gather, fight |
| **Enemy** (Predators) | Gatherer, Gator, Snake, Boss Croc | Gather, build, fight |
| **Neutral** | Cattail, Clambed | Harvestable resources (shared) |

Both factions harvest from the same neutral resource nodes. The enemy AI spawns its own gatherers from Predator Nests and collects resources into its own stockpile (`enemyResources` in GameWorld).

## Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Clams** | Clambed nodes (25,000 each) | Units, buildings, tech |
| **Twigs** | Cattail nodes (1,000 each) | Buildings, tech |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from completed Lodges (+4) and Burrows (+4).

### Resource Scarcity

Resources are finite and shared between factions. Both player and enemy gatherers harvest from the same clam beds and cattail nodes. When a node is depleted, it's gone -- forcing expansion to control new resource areas. Strategic resource denial (harvesting nodes near the enemy, or defending key nodes) is a core part of gameplay.

## Expansion

Players can build multiple Lodges across the map. Each Lodge:
- Provides +4 population cap
- Serves as a resource drop-off point for gatherers
- Can train Gatherers and research Lodge-tier tech

Expanding to new Lodges near fresh resource nodes is essential as nearby deposits deplete. Losing a Lodge reduces your population cap and economy.

## Buildings

| Building | Cost | Provides |
|----------|------|----------|
| **Lodge** | Starting (additional: buildable) | Trains Gatherers, +4 food cap, tech research, resource drop-off |
| **Burrow** | 100T | +4 food cap |
| **Armory** | 250C 150T | Trains Brawler/Sniper/Healer, combat tech |
| **Tower** | 200C 250T | Auto-attack turret (200px range) |
| **Watchtower** | 400C 350T | Long-range turret (280px, requires Eagle Eye) |

Buildings start at 1 HP and must be constructed by Gatherers. Progress shown as percentage.

## Units

### Player Units

| Unit | HP | Speed | Damage | Range | Cost |
|------|----|----|--------|-------|------|
| **Gatherer** | 30 | 2.0 | 2 | 40 | 50C 1F |
| **Brawler** | 60 | 1.8 | 6 | 40 | 100C 50T 1F |
| **Sniper** | 40 | 1.6 | 8 | 180 | 80C 80T 1F |
| **Healer** | 25 | 1.8 | 0 | - | 80C 60T 1F |

### Enemy Units

| Unit | HP | Speed | Damage | Range | Special |
|------|----|----|--------|-------|---------|
| **Gatherer** | 30 | 2.0 | 2 | 40 | Collects resources for enemy economy |
| **Gator** | 60 | 1.8 | 6 | 40 | Basic melee |
| **Snake** | 60 | 2.0 | 4 | 40 | Fast melee |
| **Boss Croc** | 200 | 1.2 | 15 | 50 | AoE stomp, enrage at 30% HP |

## Unit Counter System

A damage multiplier table creates rock-paper-scissors dynamics between unit types. Multipliers above 1.0 mean the attacker is strong against that defender; below 1.0 means weak. Unlisted matchups default to 1.0 (neutral).

| Attacker | Strong vs (1.5x) | Weak vs (0.75x) |
|----------|-------------------|------------------|
| **Brawler** | Sniper, Healer | Gator |
| **Sniper** | Healer, Snake | Brawler |
| **Gator** | Brawler | Sniper |
| **Snake** | Sniper | Brawler |

Boss Croc has no counter multipliers -- it deals full damage to all targets.

This system rewards army composition decisions: a pure Brawler army will struggle against Gators, while mixing in Snipers creates a balanced force.

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

Researched at the Lodge or Armory. Some techs have prerequisites:

| Tech | Cost | Effect | Building | Requires |
|------|------|--------|----------|----------|
| **Sturdy Mud** | 200C 300T | +300 HP to all player buildings | Lodge | -- |
| **Swift Paws** | 250C 200T | +0.4 speed to all player units | Lodge | Sturdy Mud |
| **Sharp Sticks** | 300C 200T | +2 damage to all combat units | Armory | -- |
| **Eagle Eye** | 400C 300T | +50 range for snipers, unlocks Watchtower | Armory | Sharp Sticks |
| **Hardened Shells** | 500C 400T | +5 HP regen for all units | Armory | Eagle Eye |

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
| **Auto-Defend** | Idle Combat | Wander-patrol near Lodge using Yuka steering |
| **Auto-Attack** | Idle Combat | Attack-move toward nearest enemy |

## Win/Lose Conditions

- **Win**: All Predator Nests destroyed
- **Lose**: Player Lodge destroyed (any Lodge -- if all are destroyed)
- **Rating**: 1-3 stars based on time survived and kill ratio

## Day/Night Cycle

- Time advances at 0.05 minutes per frame, wrapping at 24 hours (1440 minutes)
- Ambient darkness calculated from TIME_STOPS color palette
- Fireflies appear during dark periods
- Night reduces visibility range
