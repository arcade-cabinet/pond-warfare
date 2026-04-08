# Gameplay Design (v3)

## Overview

Pond Warfare is a mobile-first real-time strategy game set in a pond ecosystem. The player controls a colony of otters defending their Lodge from escalating waves of predators. There is one game mode: defend the Lodge. The metagame uses a dual-path loop:

- **Clams** are the current-run currency. Winning matches earns Clams, and between matches the player spends them on temporary power and frontier expansion for the current prestige cycle.
- **Pearls** are the prestige currency. Ranking up resets the Clam run and converts long-run progress into permanent unlocks and automation from the main menu.

The core loop: PLAY -> WIN -> SPEND CLAMS TO PUSH THE CURRENT RUN -> RANK UP FOR PEARLS -> REPEAT.

The canonical unit model is defined in [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md), with a machine-readable copy in [configs/unit-model.json](/Users/jbogaty/src/arcade-cabinet/pond-warfare/configs/unit-model.json). Older docs that describe separate baseline `Gatherer`, `Fighter`, and `Scout` units plus free match-start Pearl auto-deploys should be treated as obsolete.

### Baseline Balance Rule

The baseline game must be technically playable without spending either Clams or Pearls:

- A fresh prestige cycle should be able to clear the first exposure to each of the six panel stages using only baseline tools
- Clams act as a **pressure-relief valve**, easing the rising swarm complexity and enemy scaling across successive matches in the same run
- Pearls act as the permanent long-run acceleration layer
- If a building or response is required to clear a pane for the first time, it belongs in the baseline pane progression, not behind Clams

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
6. Rewards Screen opens -> spend Clams for the next match in the current run
7. When the run slows down enough, the RANK UP button begins to matter -> prestige for Pearls from the main menu

## Resources

### In-Match Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Fish** | Fish nodes (Clambed) | Training manual units and Pearl specialists |
| **Rocks** | Rock deposits (PearlBed) | Building fortifications |
| **Logs** | Tree clusters (Cattail) | Building construction, repairs |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from the Lodge (+8) and Burrow wings (+6). Under the canonical specialist model, Pearl specialists are trained during a match and should be balanced intentionally rather than appearing as free hidden-cap helpers.

Resources are finite. When a node is depleted, it is gone -- forcing expansion toward fresh nodes. Both factions compete for the same resource nodes.

### Metagame Currencies

| Currency | Source | Used For |
|----------|--------|----------|
| **Clams** | Earned post-match victories | Current-run upgrades between matches, including Frontier Expansion diamonds; resets on Rank Up |
| **Pearls** | Earned from prestige (Rank Up) | Permanent main-menu upgrades, automation, commander/loadout progression, starting-tier boosts |

## Vertical Map & 6-Panel Grid

Maps use a 6-panel grid system (`configs/panels.json`). Each panel has a unique biome, resource types, terrain features, and a frontier unlock stage. The Lodge panel sits at the bottom center; enemy panels are at the top. The intended run loop is:

1. Clear the current battlefield shape
2. Enter the Clam upgrade screen
3. Buy temporary upgrades and, when available, the next Frontier Expansion
4. Start the next match on a larger battlefield

| Panel | Biome | Resources | Unlock Stage |
|-------|-------|-----------|--------------|
| 1 | Rocky Marsh | Fish, Trees | 3 |
| 2 | Muddy Forest | Trees | 2 |
| 3 | Flooded Swamp | Fish, Trees | 3 |
| 4 | Open Grassland | All | 1 (start) |
| 5 | Sandy Shore | Fish, Rocks | 1 (start) |
| 6 | Dense Thicket | Trees, Rocks | 2 |

Map dimensions also scale with progression level (from `configs/terrain.json`):

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

### Manual Units

The baseline run uses a compact manual roster that expands only when new pressure complexity demands a new response.

| Unit | Unlock Stage | Role |
|------|--------------|------|
| **Mudpaw** | 1 | Baseline manual generalist. Gathers, fights, scouts, builds, repairs. |
| **Medic** | 2 | Manual healing/support once logs and repair pressure enter the run. |
| **Sapper** | 5 | Manual siege/demolition once rocks, fortifications, and flank pressure matter. |
| **Saboteur** | 6 | Manual disruption/subversion once the full six-panel pressure set is active. |

`Mudpaw` replaces the older split baseline `Gatherer + Fighter + Scout` model. Clam upgrades are intended to make that one reusable manual chassis better at economy, vision, field utility, and survivability.

The live player-facing Lodge surfaces now follow that model:

- stage 1 Lodge/radial training exposes `Mudpaw`
- `Medic` appears at stage 2
- `Sapper` appears at stage 5
- `Saboteur` appears at stage 6
- selected `Mudpaws` use the mixed generalist radial, not the old gatherer-only command set

### Pearl Specialists

Pearls unlock specialist blueprints, autonomy, and specialist growth. They do not exist to give the player free match-start godmode bodies.

| Specialist | Domain | Behavior |
|------------|--------|----------|
| **Fisher** | Economy | Autonomous fish harvesting in an assigned area |
| **Logger** | Economy | Autonomous log harvesting in an assigned area |
| **Digger** | Economy | Autonomous rock harvesting in an assigned area |
| **Guard** | Combat | Autonomous infantry coverage in an assigned area |
| **Ranger** | Combat | Autonomous ranged coverage in an assigned area |
| **Bombardier** | Combat | Autonomous siege support in an assigned area |
| **Shaman** | Support | Autonomous healing in an assigned area |
| **Lookout** | Recon | Autonomous scouting in an assigned area |

### Specialist Control Model

Pearl specialists are trained during a match after their blueprint is unlocked. The player still pays in-match resources to spawn them.

- Specialists are autonomous by default
- The player can still select and reposition them
- Specialists are assigned to a terrain area, not a single target
- That area defines the specialist's Yuka-governed operating radius
- Within that radius, the specialist searches for work matching its role
- Radius growth is a primary Pearl upgrade path alongside unlock, cap, throughput, and durability
- The Lodge action panel shows only the specialist blueprints the player has actually unlocked and the current field-cap state for each

The live Pearl progression surface now reflects that model directly:

- Pearl upgrades are grouped per specialist on the Pearl screen
- specialist rows now mix blueprint unlocks with zone-growth rows instead of hiding all specialist progression inside one generic section
- single-zone specialists upgrade `operating radius`
- `Ranger` and `Bombardier` upgrade `anchor radius`, `engagement radius`, and `projection range`

### Specialist Radius UI

Selecting a specialist should reveal its assignment geometry on the map.

- Single-zone specialists show one assigned circle plus a dotted line from the unit to that circle
- Dual-zone specialists show an `anchor` circle, an `engagement` circle, and a dotted line connecting them
- The dotted link is not just cosmetic; where appropriate, its reach becomes an upgradeable `projection range`
- Circle and line styling should visually correlate to the selected specialist via color, glyph, or both
- The runtime now applies Pearl zone upgrades into those circles and projection limits when the specialist is spawned

## Commanders

Commanders are permanent Pearl/loadout progression. Their bonuses must hook live gameplay systems only; dead tech-tree and removed-unit references are obsolete.

### Commander Passives

| Commander | Primary Effect | Secondary Effect |
|----------|----------------|------------------|
| **Marshal** | Nearby units deal +15% damage | None |
| **Sage** | Nearby Mudpaws gain +25% gather rate | Mudpaws gain +10% gather rate globally |
| **Warden** | Nearby buildings gain +200 HP | Towers attack 20% faster |
| **Tidekeeper** | All nearby units gain +0.4 speed | Fishers cost 50% less to field |
| **Shadowfang** | Enemies in aura deal -10% damage | Rangers gain +50% projection range |
| **Ironpaw** | Nearby units gain +20% HP | Guards cost 50% less to field |
| **Stormcaller** | Nearby units deal +10% damage | Bombardiers gain +50% projection range and lightning strikes every 15 seconds |

### Commander Abilities

The active commander ability is bound to the HUD button / `Q` and must produce real runtime effects:

| Commander | Ability | Live Effect |
|----------|---------|-------------|
| **Marshal** | `Charge!` | Selected units gain 2x movement speed for 5 seconds |
| **Sage** | `Eureka!` | Instantly grants +60 Fish, +20 Logs, +10 Rocks |
| **Warden** | `Fortify!` | Player buildings are invulnerable for 10 seconds |
| **Tidekeeper** | `Tidal Wave` | Pushes and damages enemies around the Lodge |
| **Shadowfang** | `Vanish` | Player units become untargetable through temporary stealth for 8 seconds |
| **Ironpaw** | `Iron Will` | Player units ignore incoming damage for 5 seconds |
| **Stormcaller** | `Thunder Strike` | Deals massive AoE damage at the camera center |

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

Built by Mudpaws using Rocks. Placed around the Lodge perimeter. Fort slot count scales with progression level.

| Fortification | HP | Cost (Rocks) | Effect |
|---------------|----|-------------|--------|
| **Wood Wall** | 100 | 15 | Blocks enemy movement |
| **Stone Wall** | 250 | 40 | Reinforced barrier, higher HP |
| **Watchtower** | 150 | 30 | Auto-attacks enemies (5 dmg, 200 range) |
| **Siege Tower** | 200 | 60 | Heavy fire platform (15 dmg, 300 range) |

Fort slots per progression level: 4 (level 0-9), 8 (level 10-29), 12 (level 30+).

## Lodge & Buildings

The central building. If it falls, the match is lost.

- **Base HP**: 500 (scales with upgrades)
- **Baseline building unlocks**: Required responses should arrive organically with the first panel that demands them. If a building is necessary to clear the next pane, it must not be gated behind Clams.
- **Clam upgrades**: Clams can strengthen or specialize a building during the current prestige run, but they should not be the gate for a required building to exist.
- **Pearl upgrades**: Pearls can permanently unlock optional automation, commander/loadout progression, and non-essential building variants.
- **Building wings**: Armory, Burrow, FishingHut, HerbalistHut, Market, and Dock are Lodge wings rather than standalone structures. They appear as ECS entities for gameplay purposes but are conceptually attached to the Lodge.
- **Manual training surface**: The Lodge is the player-facing manual production building. Armory and Burrow should not expose obsolete combat-worker production queues in the live UI.
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

Between matches, the player spends earned Clams on run-scoped upgrades arranged in a web of 240+ nodes. These upgrades persist across matches in the current prestige cycle and reset on Rank Up.

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

Cross-category milestone nodes mark the big run-level pivots:

- **Frontier Expansion I-V**: Unlock the next battlefield shape and panel count for the current prestige run
- **Run power spikes**: Optional current-run multipliers and specializations
- **Design constraint**: A diamond should never be the gate for a building or response that is required to clear the next pane

Diamond nodes have multi-path requirements (for example, "Gathering tier 5 AND Economy tier 3").

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

When the player reaches a progression threshold and the run starts to taper off, they can **Rank Up** (prestige):

1. All Clam upgrade progress is reset
2. Player earns Pearls: `floor(progression_level * 0.5)`
3. Pearls are spent on permanent upgrades that persist across prestiges

### Pearl Upgrades

Pearl upgrades are the permanent main-menu layer. They can unlock:

#### Specialist blueprints and autonomy
- Unlock Fisher, Logger, Digger, Guard, Ranger, Bombardier, Shaman, and Lookout
- Increase specialist cap or deployment slots
- Increase specialist operating radius
- Increase specialist throughput, efficiency, or survivability

Specialists are intended to be strategic in-match investments after Pearl unlock, not free match-start units. Pearls unlock the blueprint and the autonomy layer; Fish, Logs, and Rocks still gate how many specialists the player actually fields during a match.

#### Permanent passives / behavior unlocks
- Lodge-adjacent unit regen
- Lodge self-repair
- Rare resource access
- Other non-essential automation that should survive prestige

#### Permanent multipliers / run shortcuts
- Gather speed multipliers
- Unit HP and damage multipliers
- Clam earnings multipliers
- Starting tier boosts so new runs begin above the base Clam rank

## Post-Match Rewards

After each match, the Rewards Screen shows earned Clams and routes the player back into the current run:

**Formula**: `(base + kill_bonus + event_bonus + resource_bonus + survival_bonus) * prestige_multiplier`

| Component | Value |
|-----------|-------|
| Base Clams | 20 (always earned) |
| Kill Bonus | 2 per enemy killed |
| Event Bonus | 6 per event completed |
| Resource Bonus | 8 per 100 resources gathered |
| Survival Bonus | 4 per minute survived |
| Prestige Multiplier | 1.0 + (rank * 0.1) |
| Loss Penalty | 50% of total |

### Rank Up Eligibility

Rank Up becomes available when `progression_level >= rank_threshold_base * (1 + current_rank * 0.5)`. Base threshold is 20. In practice, the current run keeps feeding Clam upgrades and panel growth until that pressure curve slows enough that cashing out for Pearls becomes the better move.

## Combat Mechanics

- **Auto-aggro**: Idle combat units engage enemies within aggro radius (200px player, 250px enemy)
- **Retaliation**: Units under attack fight back (legacy gatherer references should be read as the Mudpaw role)
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

## Auto-Symbol Unit Autonomy

After a player unit completes an order and is deselected, a themed icon (the auto-symbol) appears above its head for 4 seconds. If the player taps the icon, the unit's auto-behavior is confirmed and it loops its last action. If not tapped, the icon fades and the unit returns to idle.

This provides a non-intrusive way to set up automated economy and defense without micro-managing every unit. Auto-symbols are rendered as PixiJS overlays (`src/rendering/pixi/auto-symbol-overlay.ts`) and driven by the `autoSymbolSystem` ECS system.

## Legacy Automation Note

The current runtime still contains legacy auto-behavior toggles and auto-symbol flows from the older generalist model. The canonical direction is to move that automation into Pearl specialist area assignment, as defined in [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md).

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

## Comic Panel Landing Page

The main menu uses a comic book landing page (`src/ui/comic-landing.tsx`) with three stacked panels, each featuring an SVG sprite character:

- **Panel 1** (Otter, left): "Ready for battle?" -- PLAY + optional CONTINUE
- **Panel 2** (Croc, right): "Power up, soldier" -- UPGRADES + optional PRESTIGE
- **Panel 3** (Snake, left): "Adjust your gear" -- SETTINGS

The SwampEcosystem canvas renders behind all panels with animated fog blobs and fireflies. Panels are staggered left/center/right in landscape and fill width in portrait.

## Sound Design

Unit-specific SFX via Tone.js synthesis with spatial stereo panning. Effects include building placement, research complete, train complete, unit death, building destruction, heal, and error sounds. Music adapts between peaceful and combat states.

## Difficulty

The game scales pressure through two overlapping axes:
- **Frontier stage**: More panels means more resources, more enemy angles, and more required responses
- **Progression level**: Longer runs push prestige thresholds, event pools, and long-run intensity

## Persistence

All metagame state (prestige rank, Pearls, Clams, upgrade purchases, settings) is persisted via SQLite using capacitor-sqlite + jeep-sqlite. The persistence layer is in `src/storage/` with queries in `src/ui/store-v3-persistence.ts`. There is no localStorage fallback.
