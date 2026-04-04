> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Pond Warfare v1.5.0 — Depth

## Overview

v1.4.0 added breadth (sprites, maps, survival mode, commander abilities). v1.5.0 adds depth — making existing systems richer with tactical combat, new units/enemies, economic trading, and campaign branching. The goal is that every game feels meaningfully different based on player choices.

## Goals

1. Combat becomes tactical (flanking, elevation damage, morale, retreat)
2. 3 new player units that enable new strategies (Diver, Engineer, Shaman)
3. 2 new enemy types that force adaptation (Burrowing Worm, Flying Heron)
4. Resource trading via Market building (economy gets a new dimension)
5. Campaign branches after Mission 3 (replay value)
6. Water rendering with animated ripples (visual depth)
7. Building construction stages (scaffolding → complete)

## User Stories

### US1: Flanking + Elevation Damage
As a player, I want units attacking from behind to deal bonus damage and units on high ground to deal bonus damage, so that positioning matters in combat.

Acceptance Criteria:
- [ ] Flanking: +25% damage when attacking from behind (>120 degree angle from target facing)
- [ ] Elevation: +10% damage attacking downhill, -10% attacking uphill
- [ ] Visual indicator: brief "FLANKED!" or "HIGH GROUND!" floating text on bonus damage
- [ ] Affects all melee and ranged attacks
- [ ] Integration test verifying damage bonuses

### US2: Morale System
As a player, I want units near the Commander to fight harder and outnumbered units to fight worse, so that army composition and positioning matter.

Acceptance Criteria:
- [ ] Units within Commander aura: +10% damage, +10% speed (stacks with existing aura)
- [ ] Units outnumbered 3:1 in local area: -20% damage, -10% speed (demoralized)
- [ ] Visual: demoralized units have a small grey cloud particle
- [ ] Commander death: all units demoralized for 10 seconds
- [ ] Integration test

### US3: Auto-Retreat
As a player, I want units below 25% HP to auto-retreat to the nearest friendly building, so that I don't lose wounded units I forgot about.

Acceptance Criteria:
- [ ] When HP drops below 25%, unit state changes to Retreat
- [ ] Retreating unit moves toward nearest player building
- [ ] Player can override retreat by issuing a new command
- [ ] Auto-retreat can be toggled off in settings
- [ ] Retreating units have a white flag/retreat visual indicator
- [ ] Integration test

### US4: Otter Diver Unit
As a player, I want a stealth unit that can hide in water tiles and ambush enemies, so that water terrain has offensive strategic value.

Acceptance Criteria:
- [ ] New unit: Diver (HP: 25, Speed: 2.5, Damage: 8, Range: melee)
- [ ] Unlocked via Nature branch: Deep Diving tech
- [ ] Can enter Water tiles (like Swimmer) but becomes invisible
- [ ] Attacks from water get +50% damage (ambush bonus)
- [ ] Visible to enemies only when attacking or on non-water terrain
- [ ] Trained at Lodge
- [ ] Cost: 60C 40T, Food: 1
- [ ] Sprite, voice lines, dialogue barks
- [ ] Integration test

### US5: Otter Engineer Unit
As a player, I want a utility unit that builds faster, repairs buildings, and can construct temporary bridges, so that I have more strategic options.

Acceptance Criteria:
- [ ] New unit: Engineer (HP: 40, Speed: 1.5, Damage: 1, Range: melee)
- [ ] Unlocked via Fortifications branch: Fortified Walls tech
- [ ] Builds 2x faster than Gatherers
- [ ] Can repair damaged buildings (right-click friendly building)
- [ ] Can build Temporary Bridge on Water tile (lasts 300 frames, allows all units to cross)
- [ ] Trained at Armory
- [ ] Cost: 80C 60T, Food: 1
- [ ] Integration test

### US6: Otter Shaman Unit
As a player, I want a support caster that heals in an area, so that I can sustain my army during prolonged combat.

Acceptance Criteria:
- [ ] New unit: Shaman (HP: 30, Speed: 1.6, Damage: 0, Range: 0)
- [ ] Unlocked via Nature branch: Regeneration tech
- [ ] Passive: heals all friendly units within 100px for 2 HP/5s
- [ ] Different from Healer (single-target) — Shaman is AoE
- [ ] Trained at Lodge
- [ ] Cost: 70C 50T, Food: 1
- [ ] Healing shown as green particle ring
- [ ] Integration test

### US7: Burrowing Worm Enemy
As a player, I want to face enemies that appear from underground and attack resource nodes, so that I need to defend my economy, not just my base.

Acceptance Criteria:
- [ ] New enemy: Burrowing Worm (HP: 60, Speed: 1.0, Damage: 10, Range: melee)
- [ ] Spawns underground (invisible), surfaces near player resource nodes
- [ ] Targets resource nodes specifically (destroys them)
- [ ] Appears at Evolution Tier 3+
- [ ] Visual: burrow emergence animation (ground ripple → pop up)
- [ ] Audio: rumbling sound on emergence
- [ ] Integration test

### US8: Flying Heron Enemy
As a player, I want to face fast flying enemies that ignore terrain, so that I need anti-air (ranged) units and can't rely on terrain chokepoints alone.

Acceptance Criteria:
- [ ] New enemy: Flying Heron (HP: 20, Speed: 3.5, Damage: 4, Range: melee)
- [ ] Ignores all terrain speed modifiers (flies over water, rocks, etc.)
- [ ] Fast but fragile — countered by Snipers and Towers
- [ ] Appears at Evolution Tier 2+
- [ ] Visual: rendered slightly above ground level (y-offset -10px)
- [ ] Integration test

### US9: Market Building + Resource Trading
As a player, I want to build a Market that trades excess resources, so that I can convert twigs to clams when I have surplus.

Acceptance Criteria:
- [ ] New building: Market (HP: 100, Cost: 150C 100T)
- [ ] When selected, shows trade buttons: "Sell 100 Twigs → 60 Clams", "Sell 100 Clams → 60 Twigs"
- [ ] Exchange rate: 100:60 (40% loss — trading is inefficient but useful)
- [ ] Pearl trading: "Sell 50 Pearls → 100 Clams" (pearls are rare, worth more)
- [ ] Trade cooldown: 30 seconds between trades
- [ ] Visual: coin particles on trade completion
- [ ] Integration test

### US10: Campaign Branching
As a player, I want to choose between two different Mission 4 paths after completing Mission 3, so that the campaign has replay value.

Acceptance Criteria:
- [ ] After Mission 3: choice screen "Offense Path" or "Defense Path"
- [ ] Mission 4A (Offense): "Predator's Lair" — assault 3 nests with limited troops, Warfare/Shadow focus
- [ ] Mission 4B (Defense): "Siege of the Lodge" — survive 10 waves, Fortifications/Nature focus
- [ ] Both paths lead to Mission 5
- [ ] Choice persisted in campaign save
- [ ] Different dialogue/briefing per path
- [ ] Replay campaign to try the other path

### US11: Animated Water Rendering
As a player, I want water tiles to have animated ripple effects, so that the terrain feels alive.

Acceptance Criteria:
- [ ] Water tiles use the Water Ripples PNG assets as animated overlay
- [ ] Subtle ripple animation cycling every 2-3 seconds
- [ ] Shallows have lighter/faster ripples than deep Water
- [ ] Performance: no FPS impact (use sprite sheet cycling, not shader)

### US12: Building Construction Stages
As a player, I want to see buildings visually progress through construction stages, so that building feels like a real process instead of instant appearance.

Acceptance Criteria:
- [ ] 3 visual stages: foundation (0-33%), frame (34-66%), complete (67-100%)
- [ ] Each stage has a distinct visual (darker/transparent at foundation, scaffolding at frame)
- [ ] Simple implementation: tint/opacity changes, not separate sprites
- [ ] Completion triggers the existing ceremony (gold text, sound, minimap ping)

## Technical Requirements

- New units added to EntityKind enum, ENTITY_DEFS, archetypes, sprites
- New enemy types added to enemy evolution tier system
- Market building uses existing building/action-panel system
- Campaign branching extends campaign-system.ts with path state
- Water animation via PixiJS sprite cycling on water terrain tiles
- All files < 300 LOC

## Out of Scope

- Multiplayer, replay system, weather effects (v2.0.0)
- Dock building / naval combat (v2.0.0)
- More than 2 campaign branch paths

## Implementation Plan

Phase 1: Combat depth (US1, US2, US3)
Phase 2: New units (US4, US5, US6)
Phase 3: New enemies + Market (US7, US8, US9)
Phase 4: Campaign + Visual (US10, US11, US12)
