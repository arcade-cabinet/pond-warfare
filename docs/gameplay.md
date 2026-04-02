# Gameplay Design

## Overview

Pond Warfare is a Warcraft II-style real-time strategy game set in a pond ecosystem. Two factions -- otters and predators -- compete for the same finite resource nodes, build economies, train armies, and fight for map control. The enemy AI runs its own economy with gatherers, funds army production from collected resources, and makes strategic attack decisions. An enemy evolution system progressively unlocks stronger predator types over time, forcing the player to adapt.

## Factions

| Faction | Units | Role |
|---------|-------|------|
| **Player** (Otters) | Gatherer, Brawler, Sniper, Healer, Shieldbearer, Scout, Catapult, Swimmer, Trapper, Commander, Diver, Engineer, Shaman, OtterWarship, Berserker | Build, gather, fight |
| **Enemy** (Predators) | Gator, Snake, ArmoredGator, VenomSnake, SwampDrake, SiegeTurtle, AlphaPredator, BossCroc, BurrowingWorm, FlyingHeron | Gather, build, fight |
| **Neutral** | Cattail, Clambed, PearlBed, Frog, Fish | Resources + ambient critters |

Both factions harvest from the same neutral resource nodes. The enemy AI spawns its own gatherers from Predator Nests and collects resources into its own stockpile (`enemyResources` in GameWorld).

## Resources

| Resource | Source | Used For |
|----------|--------|----------|
| **Clams** | Clambed nodes (4,000 each) | Units, buildings, tech |
| **Twigs** | Cattail nodes (400 each) | Buildings, tech |
| **Pearls** | PearlBed nodes (500 each) | Elite techs (Hardened Shells, Siege Works, etc.) |
| **Food** | Population count vs housing cap | Limits unit count |

Food works as a population system: each non-building player entity counts as 1 food. Max food comes from completed Lodges (+8), Burrows (+6), Fishing Huts (+2), and Docks (+2).

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
| **Market** | 200C 150T | Resource trading (convert excess twigs/clams) |
| **Dock** | 150C 100T | Trains water units (Warship), +2 food cap |
| **Wall Gate** | 50T | Allows allied passage, blocks enemies (80 HP) |
| **Shrine** | 300C 200T 25P | One-time powerful ability activation (60 HP) |

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
| **Commander** | 80 | 2.0 | 5 | 60 | -- (unique hero) |
| **Diver** | 25 | 2.5 | 8 | 40 | 60C 40T 1F |
| **Engineer** | 40 | 1.5 | 1 | 40 | 80C 60T 1F |
| **Shaman** | 30 | 1.6 | 0 | - | 70C 50T 1F |
| **Otter Warship** | 80 | 1.5 | 12 | 200 | 200C 150T 1F |
| **Berserker** | 60 | 2.0 | 15 | 40 | 120C 80T 1F |

**Swimmer** is a fast amphibious unit ideal for flanking and raiding. **Trapper** places speed debuff traps that slow enemies passing through them. **Shieldbearer** is a high-HP tank that absorbs damage for squishier units. **Catapult** deals devastating siege damage from extreme range but is slow and fragile. **Diver** is a stealth assassin, invisible in water tiles with a first-strike bonus. **Engineer** builds temporary bridges over water. **Shaman** provides area-of-effect healing to nearby units. **Otter Warship** is a naval ranged unit trained at Docks. **Berserker** deals increasing damage as its HP decreases (rage mechanic).

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
| **Burrowing Worm** | 60 | 1.0 | 10 | 40 | Underground ambusher (event spawn) |
| **Flying Heron** | 20 | 3.5 | 4 | 40 | Ignores terrain (event spawn) |

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

Researched at the Lodge or Armory. 25 technologies across three branches: Lodge (economy/defense), Armory (military), and Nature (new units/support). Some techs require Pearls. Three active abilities (Rally Cry, Pond Blessing, Tidal Surge) provide powerful one-time or cooldown-based effects.

### Lodge Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Sturdy Mud** | 200C 300T | +300 HP to all player buildings | -- |
| **Swift Paws** | 300C 250T | +0.4 speed to all player units | Sturdy Mud |
| **Fortified Walls** | 150C 100T | Wall HP +100, walls slow nearby enemies | Sturdy Mud |
| **Rally Cry** | 250C 200T | Active: all units +30% speed for 10s (cooldown) | Swift Paws |
| **Cartography** | 150C 100T | Unlocks Scout Post, +25% fog reveal | -- |
| **Trade Routes** | 200C 150T | +3 clams/5sec passive income per Lodge | Cartography |
| **Tidal Harvest** | 200C 150T | Gatherers collect +50% resources | -- |

### Armory Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Sharp Sticks** | 300C 200T | +2 damage to all combat units | -- |
| **Eagle Eye** | 400C 300T | +50 range for snipers | Sharp Sticks |
| **Hardened Shells** | 500C 400T 30P | +5 HP regen for all units | Eagle Eye |
| **Piercing Shot** | 200C 150T | Snipers ignore 50% of damage reduction | Eagle Eye |
| **Iron Shell** | 300C 200T | Unlocks Shieldbearer unit | Sharp Sticks |
| **Siege Works** | 400C 350T 50P | Unlocks Catapult unit | Eagle Eye |
| **Siege Engineering** | 300C 250T | Catapults fire 25% faster | Siege Works |
| **Battle Roar** | 350C 250T | +10% attack speed for all units | Sharp Sticks |
| **War Drums** | 250C 200T | +15% damage within 200px of Armory | Battle Roar |
| **Cunning Traps** | 200C 150T | Unlocks Trapper (speed debuff traps) | Sharp Sticks |
| **Venom Coating** | 200C 150T | Melee attacks apply 1 dmg/sec poison for 3s | Cunning Traps |
| **Camouflage** | 300C 200T | Blend into reeds, strike unseen | Cunning Traps |

### Nature Branch

| Tech | Cost | Effect | Requires |
|------|------|--------|----------|
| **Herbal Medicine** | 100C 80T | Ancient pond remedies heal nearby wounded | -- |
| **Pond Blessing** | 300C 200T 20P | One-time active: heal all units to full HP | Herbal Medicine |
| **Aquatic Training** | 150C 100T | Unlocks Swimmer (amphibious warfare) | Herbal Medicine |
| **Deep Diving** | 200C 150T | +30% pearl gathering rate | Aquatic Training |
| **Root Network** | 200C 150T 15P | Buildings share vision radius | Deep Diving |
| **Tidal Surge** | 400C 300T 40P | One-time active: deal 50 damage to all enemies | Deep Diving |

### Active Abilities

Three techs unlock active abilities controlled from the HUD:

| Ability | Type | Effect | Tracked In |
|---------|------|--------|------------|
| **Rally Cry** | Cooldown | All units +30% speed for 10s | `world.rallyCryExpiry`, `world.rallyCryCooldownUntil` |
| **Pond Blessing** | One-time | Heal all units to full HP | `world.pondBlessingUsed` |
| **Tidal Surge** | One-time | Deal 50 damage to all enemies on map | `world.tidalSurgeUsed` |

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

## Campaign Mode

5 guided missions with scripted Commander dialogue, per-frame objective tracking, and mission-specific settings overrides. Missions unlock sequentially; progress persists in SQLite.

| # | Mission | Type | Objectives |
|---|---------|------|-----------|
| 1 | First Dawn | Tutorial | Build Armory + Train 3 Brawlers |
| 2 | Into the Fog | Scouting | Explore 50% map + Build second Lodge |
| 3 | The Nest Must Fall | Offense | Destroy 1 Enemy Nest |
| 4 | Evolution | Adaptation | Survive to Evolution Tier 3 |
| 5 | Alpha Strike | Boss Battle | Defeat the Alpha Predator |

Objective types: `build`, `train`, `explore`, `destroyNest`, `survive`, `kill`, `buildCount`.

## Playable Factions

Two playable factions with mirrored unit rosters. Selecting a faction makes the other AI-controlled.

| Role | Otter | Predator |
|------|-------|----------|
| Base | Lodge | PredatorNest |
| Gatherer | Gatherer | Gatherer |
| Melee | Brawler | Gator |
| Ranged | Sniper | VenomSnake |
| Tank | Shieldbearer | ArmoredGator |
| Support | Healer | SwampDrake |
| Siege | Catapult | SiegeTurtle |
| Hero | Commander | BossCroc |

Each faction has its own tech tree subset (Otters: 15 techs, Predators: 8 techs).

## AI Personalities

The enemy AI behavior is modified by personality selection:

| Personality | Description | Attack Threshold | Tower Build | Expansion |
|-------------|------------|-----------------|-------------|-----------|
| **Balanced** | Standard behavior | 1.0x | 1.0x | 1.0x |
| **Turtle** | Heavy defense, large army before strike | 2.0x | 2.5x | 0.5x |
| **Rush** | Attacks early with cheap melee | 0.3x | 0.5x | 0.2x |
| **Economic** | Expands aggressively, massive late-game | 1.5x | 0.5x | 2.0x |
| **Random** | Switches between above every 5 minutes | varies | varies | varies |

## Commander System

7 unlockable commanders provide strategic variety through aura and passive bonuses:

| Commander | Aura | Passive | Unlock |
|-----------|------|---------|--------|
| Marshal | +10% damage | -- | Default |
| Sage | +25% research speed | +15% gather rate | Win 3 games |
| Warden | +200 HP to buildings | Towers +20% attack speed | Win on Hard |
| Tidekeeper | +0.3 speed | Swimmers cost 50% less | 200 pearls |
| Shadowfang | Enemies -15% damage | Trapper traps 2x | Win with 0 losses |
| Ironpaw | +20% HP | Shieldbearers 2x faster | 5 Hero units |
| Stormcaller | Catapults +50% range | Random lightning | Win on Nightmare |

## Leaderboards & Ranked Progression

Personal bests and ranked progression tracked in SQLite:

| Rank | Wins Required |
|------|--------------|
| Bronze | 0-4 |
| Silver | 5-14 |
| Gold | 15-29 |
| Diamond | 30+ |

Tracked stats: total wins/losses/games, total kills, fastest win, longest survival, total playtime, highest difficulty won, current/best win streak.

## Map Scenarios

9 map types providing strategic variety:

| Scenario | Description |
|----------|-------------|
| Standard | Open map, balanced resources |
| Island | Surrounded on all sides |
| Contested | Start close to enemy |
| Labyrinth | Maze walls, dead-end resources, favors Trappers |
| River | Vertical divide with bridge choke points, favors Swimmers |
| Peninsula | Narrow walled land, single entry, ultimate turtle map |
| Archipelago | Multiple small islands connected by shallow bridges, water combat matters |
| Ravine | Deep canyon with high ground on both sides, bridge chokepoints |
| Swamp | Mostly Mud/Shallows terrain, movement slow everywhere, favors defense |

## Cosmetic System

Sprite recoloring via HSL transforms provides visual customization without new art assets. 14 recolor presets for veterancy, champions, commander variants, and status effects. 6 unit skins + 4 building themes unlockable through progression. Per-kind exclusivity persisted in SQLite.

## Threat Escalation

Beyond the base evolution system, late-game threat escalation adds:
- **Mega-waves**: Every 5 minutes after tier 3, large coordinated attacks
- **Champion enemies**: +50% HP, +25% damage, visually distinct via sprite recoloring
- **Random events**: Predator migration, nest fury (production spike), alpha appearance
- **Nest production ramp**: Production multiplier increases over time

## Sound Design

Unit-specific SFX via Tone.js synthesis with spatial stereo panning:

| Unit | Select Sound | Character |
|------|-------------|-----------|
| Brawler | Low drum thud | Heavy, grounded |
| Sniper | Sharp metallic ping | Precise, high-pitched |
| Healer | Double wind chime | Gentle, layered |
| Catapult | Deep wooden creak | Slow, mechanical |
| Scout | Quick double chirp | Fast, bird-like |
| Commander | Brass horn blast | Authoritative |
| Gatherer | Tool clink | Quick, utilitarian |
| Shieldbearer | Heavy shield clang | Heavy, metallic |

Additional effects: building placement, research complete, airdrop incoming, train complete, build complete, unit death, building destruction, heal, error.

## Custom Game Settings

13 configurable options for freeplay:
- **Map**: Scenario, resource density (sparse/normal/rich/abundant)
- **Economy**: Starting resources multiplier, gather speed, starting unit count
- **Enemies**: Nest count, enemy economy strength, aggression level, evolution speed
- **Rules**: Peace timer, permadeath, fog of war mode, hero mode

## P2P Co-op Multiplayer

2-player cooperative play via Trystero/WebRTC with Nostr relay signaling:

- **Host creates room**: generates a 6-character room code, configures scenario/difficulty/seed
- **Guest joins room**: enters room code, connects via WebRTC DataChannel
- **Lockstep sync**: Both players buffer commands 3 frames ahead; frames only execute when both players' inputs are received
- **Deterministic ordering**: Host commands apply before guest commands each frame
- **Checksum validation**: Frame-level checksums detect desyncs
- **Connection quality**: HUD indicator shows connected/degraded/disconnected status
- **Disconnect handling**: Overlay appears on peer disconnect with reconnect/quit options

## Daily Challenges

A pool of 15 challenge templates rotates daily (one per UTC day, deterministic):

| Challenge | Objective | XP Reward |
|-----------|-----------|-----------|
| Back to Basics | Win with only Gatherers and Brawlers | 250 |
| Nest Breaker | Destroy 3 enemy nests | 200 |
| Speed Run | Win in under 8 minutes | 300 |
| Scholar Rush | Research 5+ techs | 200 |
| Fortress | Win without losing a building | 250 |
| ...and 10 more | Various combat, economy, and commander objectives | 150-300 |

## XP & Level System

XP earned from every game: base (100) + win bonus (200) + difficulty (0-300) + kill/building/tech bonuses + daily challenge completion. Level = totalXP / 500. Stored in SQLite player_profile table.

## Match History

Last 50 matches stored with: result, difficulty, scenario, commander, duration, kills, units lost, buildings built, techs researched, and XP earned. Auto-pruned beyond 50 records.

## Random In-Game Events

8 event types fire every 3-5 minutes after peace ends (seeded from map seed):

| Event | Duration | Effect |
|-------|----------|--------|
| Resource Surge | Instant | Random resource node doubles remaining amount |
| Migrating Fish | Permanent | 5-8 neutral fish spawn |
| Predator Frenzy | 30 seconds | All enemies +20% speed |
| Healing Spring | 30 seconds | Healing zone heals nearby units |
| Fog Bank | 60 seconds | Fog of war closes in by 30% |
| Supply Drop | Instant | +100 clams, +50 twigs |
| Earthquake | Instant | All buildings take 10% damage |
| Blessing of the Pond | 60 seconds | All player units +10% speed |

## Unlock Progression

26 unlockable items across 6 categories (Scenarios, Presets, Units, Modifiers, Cosmetics, Branch-themed). Progress tracked persistently. A next-unlock hint system shows the closest unearned unlock and its completion percentage.
