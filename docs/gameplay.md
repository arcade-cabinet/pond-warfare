# Gameplay Design

## Overview

Pond Warfare is a real-time strategy / tower defense hybrid where otters defend their pond from predator attacks. The game combines resource gathering, base building, unit training, and combat with idle-game automation options.

## Factions

| Faction | Units | Role |
|---------|-------|------|
| **Player** (Otters) | Gatherer, Brawler, Sniper, Healer | Build, gather, fight |
| **Enemy** (Predators) | Gator, Snake, Boss Croc | Attack in waves |
| **Neutral** | Cattail, Clambed | Harvestable resources |

## Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Clams** | Clambed nodes (25,000 each) | Units, buildings, tech |
| **Twigs** | Cattail nodes (1,000 each) | Buildings, tech |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from completed Lodges (+4) and Burrows (+4).

## Buildings

| Building | Cost | Provides |
|----------|------|----------|
| **Lodge** | Starting | Trains Gatherers, +4 food cap, tech research |
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
| **Gator** | 60 | 1.8 | 6 | 40 | Basic melee |
| **Snake** | 60 | 2.0 | 4 | 40 | Fast melee |
| **Boss Croc** | 200 | 1.2 | 15 | 50 | AoE stomp, enrage at 30% HP |

## Tech Tree

Researched at the Lodge or Armory:

| Tech | Cost | Effect | Building |
|------|------|--------|----------|
| **Sturdy Mud** | 200C 300T | +300 HP to all player buildings | Lodge |
| **Swift Paws** | 250C 200T | +0.4 speed to all player units | Lodge |
| **Sharp Sticks** | 300C 200T | +2 damage to all combat units | Armory |
| **Eagle Eye** | 350C 250T | +50 range for snipers, unlocks Watchtower | Armory |
| **Hardened Shells** | 400C 300T | Passive regen +5 HP (instead of +1) when idle | Armory |

## Combat Mechanics

- **Auto-aggro**: Idle combat units engage enemies within aggro radius every 30 frames
- **Retaliation**: Units under attack fight back (gatherers flee first for 1.5s)
- **Ally assist**: Nearby idle allies join combat within 300px
- **Attack-move patrol**: Units scan for enemies every 15 frames while moving
- **Towers**: Auto-target nearest enemy within range, fire projectiles

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
- **Lose**: Player Lodge destroyed
- **Rating**: 1-3 stars based on time survived and kill ratio

## Day/Night Cycle

- Time advances at 0.05 minutes per frame, wrapping at 24 hours (1440 minutes)
- Ambient darkness calculated from TIME_STOPS color palette
- Fireflies appear during dark periods
- Night reduces visibility range
