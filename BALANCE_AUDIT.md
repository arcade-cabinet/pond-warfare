---
title: Balance Audit (Historical)
updated: 2026-04-10
status: archived
domain: product
---

# Pond Warfare - Comprehensive Game Balance Audit (Historical Reference)

> **Historical note:** This audit predates the canonical `Mudpaw` plus trainable Pearl specialist model. Treat `Gatherer`, `Brawler`, `Armory`, and similar terminology here as historical unless a section has been explicitly updated. For the live model, use [docs/unit-model.md](docs/unit-model.md), [docs/gameplay.md](docs/gameplay.md), and [docs/balance-model.md](docs/balance-model.md).

> **Historical note:** This audit predates the canonical `Mudpaw` plus trainable Pearl specialist model. Treat `Gatherer`, `Brawler`, `Armory`, and similar terminology here as historical unless a section has been explicitly updated. For the live model, use [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md), [docs/gameplay.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/gameplay.md), and [docs/balance-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/balance-model.md).

## Executive Summary

Pond Warfare has solid foundational balance with well-designed resource economy, meaningful unit roles, and strategic tech progression. Key strengths: the counter system is well-articulated, veterancy thresholds are achievable, and tech gates feel appropriate. However, several specific balance issues emerged:

1. **Economy**: Early game slightly front-loaded but functional. Pearl economy is gated too late. Trade Routes provides poor value.
2. **Units**: Several underperforming units (Healer, Scout, Swimmer cost-efficiency). Some overpowered late-game enemies (Siege Turtle, Alpha Predator damage scaling).
3. **Tech Tree**: Good branching but Sharp Sticks -> Eagle Eye path is nearly mandatory. Pearl-gated techs lack competitive alternatives.
4. **Buildings**: Population cap scaling favors Lodge expansion over Burrow early. Watchtower cost might be excessive.
5. **Enemy Evolution**: Good timing overall but slight difficulty spike at tier 4 (Siege Turtle).
6. **Game Pacing**: Peace timer (2 min) is solid. Mid-game can feel slightly slow if economy stalls.

---

## A. RESOURCE ECONOMY

### Starting Resources vs. Initial Builds

| Resource | Starting | First Build (Armory) | Remaining |
|----------|----------|----------------------|-----------|
| Clams | 300 | 180 (Armory) | **120 left** |
| Twigs | 150 | 120 (Armory) | **30 left** |

**Analysis**:
- Player can immediately build an Armory (180C 120T) with 120 clams and 30 twigs remaining
- This allows early unit production without waiting for gatherers
- Enemy starts with 500C 200T (67% more clams, 33% more twigs) — balanced by AI needing to invest in infrastructure

**Verdict**: ✓ **HEALTHY** — Early game is accessible. Players can train units while gathering.

### Gathering Economy

| Setting | Value | Implication |
|---------|-------|-------------|
| GATHER_AMOUNT | 15 | +50% vs. typical RTS (fast gathering) |
| GATHER_TIMER | 50 frames | ~0.83s per trip |
| Starting Gatherers | 4 (via startingUnitCount) | One Lodge per 2 units |
| Clambed capacity | 4,000 clams | Supports ~133 trips per node |
| Cattail capacity | 400 twigs | Supports ~13 trips per node |

**Resource Node Density** (inferred from docs):
- Shared between factions — fights over nodes create strategic tension ✓
- Depletion forces expansion — map control matters ✓

**Pearl Gathering**:
- Gated behind Deep Diving tech (requires: Aquatic Training → Herbal Medicine)
- Tech cost: 200C 150T total for both prerequisites
- No direct pearl gathering in early game — players can't research pearl-requiring techs until 5+ mins
- **Problem**: Pearl-gated techs (Hardened Shells, Siege Works, Pondblessing, Tidal Surge) are locked until ~6–8 minutes in — but Siege Works requires Eagle Eye (which is 400C 300T), so realistic timing is 8–10 minutes

**Verdict**: ⚠ **SLIGHT ISSUE** — Pearl economy unlocks too late to meaningfully impact mid-game unit counters. Players mostly use pearls in late game.

### Resource Income Rate

Let me calculate net income over time:

**Early Game (0–2 min, Peace)**:
- Starting units: 4 Gatherers (inferred)
- Each gathers 15 resources per trip (50 frames = 0.83s)
- Theoretical max: 4 × 15 / 0.83 = ~72 resources/sec (highly idealized)
- Realistically (accounting for idle, drops, travel): ~30–40 resources/min per gatherer
- **4 Gatherers**: ~120–160 resources/min combined
- Burning rate: Armory immediately (180C 120T). Burrow (~75T). Units (~100C 50T each)
- **Net**: Slight deficit early, but Armory locks in military production capacity

**Mid Game (2–5 min)**:
- 2–3 Lodges with 6–8 Gatherers per Lodge
- Fresh nodes being exploited
- Income: ~200–300 resources/min
- Outflow: Tech (200–400C+T), units (100C 50T each), buildings
- **Net**: Positive if expanding to fresh resources. Stalls if node-starved.

**Late Game (5+ min)**:
- 3–4 Lodges, 12+ Gatherers
- Most nodes near player nests depleted
- May need to push for enemy node control
- Income: ~300–500 resources/min
- Outflow: Heavy tech (400C 300T+), elite units (300–500 resources each)
- **Net**: Highly dependent on map control and enemy pressure

**Trade Routes Tech Issue**:
- Cost: 200C 150T
- Effect: +3 clams/5sec **per Lodge** = +36 clams/min per Lodge
- With 2 Lodges: +72 clams/min
- Break-even: 200C ÷ 72 = 2.8 minutes
- But cost is high relative to other techs, and clams are less valuable than twigs by mid-game
- **Verdict**: Trade Routes is marginally valuable. Better to spend 350C on military techs.

---

## B. UNIT BALANCE

### Cost Efficiency Analysis (Resources Per Damage-Second)

Metric: `(clamCost + twigCost*1.5) / (dps)` where dps = damage / attack_cooldown

| Unit | HP | Dmg | Range | Cost (C+T) | DPS | Efficiency | Role | Rating |
|------|----|----|-------|------------|-----|-----------|------|--------|
| **Gatherer** | 30 | 2 | 40 | 50C | 0.4 | **125** | Economy | ✓ |
| **Scout** | 20 | 1 | 30 | 50C | 0.2 | **250** | Scouting | ⚠ Weak |
| **Brawler** | 60 | 6 | 40 | 100C 50T | 1.2 | **104** | Melee | ✓ Strong |
| **Swimmer** | 35 | 4 | 40 | 60C 30T | 0.8 | **112.5** | Flank | ⚠ OK |
| **Sniper** | 40 | 8 | 180 | 80C 80T | 1.6 | **105** | Ranged | ✓ Strong |
| **Healer** | 35 | 0 | — | 60C 40T | 0 | **∞** | Support | ⚠ Niche |
| **Shieldbearer** | 100 | 3 | 35 | 150C 100T | 0.6 | **333** | Tank | ⚠ Expensive |
| **Catapult** | 50 | 20 | 250 | 300C 200T | 4.0 | **112.5** | Siege | ✓ Good |
| **Trapper** | 30 | 0 | 100 | 80C 60T | 0 | **∞** | Control | ⚠ Situational |

**Notes**:
- **ATTACK_COOLDOWN** = 50 frames (0.83s at 60fps)
- Efficiency = lower is better (cheaper for same damage)

**Key Observations**:

1. **Brawler** (104) is the most efficient combat unit by a slim margin
2. **Scout** (250 efficiency) is extremely expensive for trivial damage — almost pure utility
3. **Healer** provides no direct damage but heals 5 HP/frame (inferred from code) — hard to cost
4. **Shieldbearer** (333) is 3x more expensive than Brawler per DPS — pure tank, requires support
5. **Catapult** (112.5) is very good value for siege damage but slow (0.8 speed) makes it vulnerable

**Verdict**:
- ⚠ **Scout and Healer are undervalued**. Scout should either deal more damage or cost less. Healer heal rate might be too slow.
- ✓ **Core units (Brawler, Sniper) are balanced**. Counter system makes both necessary.
- ⚠ **Shieldbearer is expensive** but necessary vs. Sniper armies. Trade-off is valid but tight.

### Player Units vs. Enemy Units (1v1 Matchups)

| Player | Enemy | Player Stats | Enemy Stats | Winner (before multipliers) |
|--------|-------|-------------|------------|-------|
| Brawler | Gator | 60 HP, 6 dmg | 60 HP, 6 dmg | **Draw** |
| Brawler | Snake | 60 HP, 6 dmg | 60 HP, 4 dmg | **Brawler** (6 > 4) |
| Sniper | Snake | 40 HP, 8 dmg | 60 HP, 4 dmg | **Snake** (60 > 40, but Sniper has 180 range) |
| Sniper | Gator | 40 HP, 8 dmg | 60 HP, 6 dmg | **Gator at close range** |
| Shieldbearer | Gator | 100 HP, 3 dmg | 60 HP, 6 dmg | **Shieldbearer** (100 HP outlasts) |

**With Damage Multipliers Applied**:

From counter table:
- Brawler 1.5x vs Sniper, 0.75x vs Gator
- Sniper 1.5x vs Healer/Snake, 0.75x vs Brawler
- Gator 1.5x vs Brawler, 0.75x vs Sniper

Example: **Brawler vs Gator**:
- Brawler: 6 dmg × 0.75 = 4.5 dmg/hit
- Gator: 6 dmg × 1.5 = 9 dmg/hit
- Outcome: Gator wins decisively (9 > 4.5)

**Verdict**: ✓ **Counter system creates meaningful trade-offs**. Pure unit compositions are weak; mixed armies are necessary.

### Early-Game Unit Composition (Peace Timer to First Evolution)

At Peace end (10,800 frames = 180 seconds):
- Assuming optimal play: 2 Lodges, 8 Gatherers, 200–300 clams, 100–200 twigs saved
- First army likely: 2 Brawlers + 1 Sniper (cost: 100C 50T + 80C 80T = 280C 210T)
- Against: Gator/Snake mix from enemy

**Verdict**: ✓ **Early unit economy works**. Players can field a balanced army by peace end.

### Enemy Unit Progression

| Tier | Unit | HP | Dmg | Cost (Est) | Timing | Threat Profile |
|------|------|----|----|------------|--------|-----------------|
| 0 | Gator | 60 | 6 | 100C 50T | Start | Basic melee |
| 0 | Snake | 60 | 4 | 80C 30T | Start | Fast support |
| 1 | Armored Gator | 120 | 8 | Est 150C 75T | 5 min | **2x HP**, harder melee |
| 2 | Venom Snake | 40 | 3 | Est 100C 50T | 10 min | Poison (2 dmg/s × 3s = 6 dmg) |
| 3 | Swamp Drake | 50 | 6 | Est 120C 60T | 15 min | Fast flanker, strong vs Gatherers |
| 4 | Siege Turtle | 300 | 25 | Est 200C 150T | **25 min** | **3x vs buildings** (75 dmg/hit!) |
| 5 | Alpha Predator | 500 | 12 | Est 250C 200T | **40 min** | Aura: +20% ally damage |

**Analysis**:

**Tier 4 (Siege Turtle) at 25 minutes**:
- 300 HP is tank-level (Catapult is 50 HP)
- 25 damage × 3.0 multiplier = 75 damage per hit vs buildings
- Tower has 500 HP → dies in ~7 hits (6 seconds)
- Watchtower has 800 HP → dies in ~11 hits (9 seconds)
- **CONCERN**: By 25 min, player likely has 2–3 Towers. Siege Turtle alone can destroy them rapidly.
- **Countermeasure**: Catapult (20 dmg, 250 range) or Shieldbearer (tank damage). But player needs to have tech'd Siege Works or Iron Shell by then.

**Tier 5 (Alpha Predator) at 40 minutes**:
- 500 HP is boss-level (nearly 2x Siege Turtle)
- +20% aura is significant (5.2 dmg per Gator becomes 6.24 with aura)
- Requires specialized counter (Catapult, high-vet Sniper)
- By 40 min, player should have Hero units with +35% HP/+40% damage bonuses — can handle it

**Verdict**: ⚠ **Slight spike at Tier 4 (Siege Turtle)**. Player must have Catapult or Shieldbearer tech by 25 min, which requires 7+ minutes of prior tech investment. Doable but tight.

---

## C. TECH TREE PROGRESSION

### Tech Cost Curve

| Tier | Techs | Avg Cost | Range | Branch |
|------|-------|----------|-------|--------|
| Tier 0 (Free) | Cartography, Herbal Medicine, Sharp Sticks, Tidal Harvest | 200-300C 150-200T | None | All |
| Tier 1 | Swift Paws, Battle Roar, Cunning Traps, Aquatic Training, Fortified Walls | 300-350C 150-250T | High variation | Mixed |
| Tier 2 | Eagle Eye, Siege Works, Deep Diving, Hardened Shells | 400-500C 300-400T **+ Pearl** | Expensive | Military + Nature |
| Tier 3 | Piercing Shot, War Drums, Root Network, Tidal Surge | 200-400C 150-300T **+ Pearl** | Wide range | Specialized |

**Analysis**:

1. **No mandatory progression bottleneck** — players can research any tier-0 tech without prerequisites ✓
2. **Sharp Sticks (300C 200T) → Eagle Eye (400C 300T)** is nearly mandatory:
   - Sharp Sticks unlocks +2 damage (essential early combat)
   - Eagle Eye unlocks +50 Sniper range (huge power spike at 180→230 range)
   - Requires 700C 500T total, doable by 5 min
   - **ISSUE**: This path essentially forces military players to invest heavily in Armory-branch techs early

3. **Pearl-gated techs (Hardened Shells, Siege Works, Pondblessing, Tidal Surge, Root Network)**:
   - Costs range 200–500C, 150–400T, **+ 15–50 pearls**
   - Pearl unlock: Deep Diving (200C 150T) → Aquatic Training (150C 100T) = 350C 250T investment + 1 gatherer → Pearl Bed
   - **Problem**: Takes 8–10 minutes to access first pearl tech. By then, Armored Gator is spawning.
   - **Solution**: Not a bug, but Pearl economy is delayed. Players should grab Quick wins (Tidal Harvest +50%, Trade Routes) instead.

4. **Tech tree breadth is good** — Herbal Medicine, Cartography, Tidal Harvest are all independent roots.

**Recommended Build Paths**:

**Military-First (Recommended)**:
1. Sharp Sticks (300C 200T) — 3 min, +2 damage
2. Eagle Eye (400C 300T) — 5 min, +50 Sniper range
3. Siege Works (400C 350T 50P) — 8 min, unlock Catapult (requires pearls; delay is OK)

**Economy-First (Viable but Slower)**:
1. Tidal Harvest (200C 150T) — 2 min, +50% gather (strong value!)
2. Herbal Medicine (100C 80T) — 1 min, unlock healing
3. Aquatic Training (150C 100T) — 2 min, unlock Swimmer
4. Sharp Sticks when resources permit

**Hybrid (Balanced)**:
1. Tidal Harvest (200C 150T) — 2 min
2. Sharp Sticks (300C 200T) — 3 min
3. Herbal Medicine (100C 80T) — 1 min
4. Eagle Eye (400C 300T) — 5 min

**Verdict**:
- ✓ **Tech tree has meaningful branching**, multiple viable paths
- ⚠ **Sharp Sticks → Eagle Eye is nearly mandatory** for military players (raises cost of entry)
- ✓ **Pearl economy is balanced** but gated appropriately (not game-breaking early, useful late)
- ⚠ **Trade Routes is underwhelming** — 200C 150T for +36C/min = 3.3 minute ROI is slow

---

## D. BUILDING PROGRESSION

### When Each Building Should Be Built

| Building | Cost | Function | Ideal Timing | Pressure |
|----------|------|----------|--------------|----------|
| **Lodge** | 200C 150T | Pop +8, drop point, Gatherer training | ASAP (peace time) | Critical |
| **Burrow** | 75T | Pop +6 (cheap) | 2–3 min (pop cap hit) | High |
| **Armory** | 180C 120T | Combat training | By peace end (3–4 min) | Critical |
| **Tower** | 200C 250T | Defense (200px, 10 dmg) | 4–5 min (first pressure) | Medium |
| **Watchtower** | 400C 350T | Strong defense (280px, 15 dmg, needs Eagle Eye) | 7–8 min (mid-game) | Medium |
| **Wall** | 50T | Barrier (400 HP) | 5+ min (base hardening) | Low |
| **Scout Post** | 100C 75T | Fog reveal | 2–3 min (exploration) | Low |
| **Fishing Hut** | 100C 75T | Pop +2, passive food | 6+ min (nice-to-have) | Low |
| **Herbalist Hut** | 150C 100T | Heal aura | 6+ min (if healing focus) | Low |

### Population Cap Scaling

| Building | Cost | Pop Provided | Cost Per Pop |
|----------|------|------------|--------------|
| **Lodge** | 200C 150T | 8 | **25C 18.75T/pop** |
| **Burrow** | 75T | 6 | **12.5T/pop** |
| **Fishing Hut** | 100C 75T | 2 | **50C 37.5T/pop** |

**Analysis**:
- Burrow is by far the cheapest per-pop (12.5T)
- Lodge is 1.5x more expensive than Burrow per pop but provides drop-off + training
- Fishing Hut is inefficient (50C 37.5T vs Burrow's 75T for 3 pops)

**Early Game Pop Cap Strategy**:
1. Start with 4 Gatherers (pop 4). Max food likely 8 (one Lodge).
2. Hit cap by ~2 min → build Burrow (75T) for +6 = 14 cap
3. Hit cap again at 3 min → build another Burrow (75T) for +6 = 20 cap
4. By 5 min: 3 Burrows (225T) + 1 Lodge (350 total resources) for 26 pop

**Verdict**: ✓ **Burrow scaling is healthy**. Creates natural expansion pressure.

### Building Defense Values

| Building | HP | Cost | DPS (if armed) | Effective HP vs Tier 1 |
|----------|----|----|------------|--------|
| **Tower** | 500 | 200C 250T | 10 dmg (player scale) | 50 hits (5 sec vs Gator) |
| **Watchtower** | 800 | 400C 350T | 15 dmg | 53 hits (5.3 sec vs Gator) |
| **Wall** | 400 | 50T | 0 | 67 hits vs Gator (6.7 sec) |

**Against Siege Turtle (25 dmg × 3.0 = 75 dmg/hit)**:
- Tower (500 HP) dies in ~7 hits = 6 seconds
- Wall (400 HP) dies in ~5 hits = 5 seconds

**Verdict**: ✓ **Towers are necessary against ranged enemies**. Walls alone won't hold.

---

## E. ENEMY EVOLUTION vs. PLAYER TECH

### Threat Alignment

| Minute | Enemy Tier | Likely Enemy Unit | Player Tech Status | Available Counter | Gap |
|--------|-----------|------------------|-------------------|------------|-----|
| **5** | Tier 1 | Armored Gator | Sharp Sticks ✓, maybe Eagle Eye | Brawler (1.5x) or Sniper (0.75x weak) | ✓ OK |
| **10** | Tier 2 | Venom Snake | Eagle Eye ✓, maybe Battle Roar | Sniper (1.5x), Healer (heal poison) | ✓ OK |
| **15** | Tier 3 | Swamp Drake | Battle Roar ✓, maybe War Drums | Shieldbearer (0.75x resist), ranged support | ✓ Manageable |
| **25** | Tier 4 | **Siege Turtle** | Should have Siege Works (?), War Drums maybe | **Catapult (siege counter)** | **⚠ TIGHT** |
| **40** | Tier 5 | Alpha Predator | Likely high-vet units, multiple upgrades | Catapult, high-vet Sniper | ✓ Manageable |

**Tier 4 Deep Dive (Siege Turtle at 25 min)**:

Player must have researched:
- Sharp Sticks (3 min) → Eagle Eye (5 min) → **Siege Works (8 min)** → unlocks Catapult
- This is 7+ minutes of investment just to unlock the counter

Meanwhile:
- Enemy starts at tier 0, ticks up every THRESHOLDS[tier] × evolutionSpeedMod minutes
- At normal speed: 5, 10, 15, 25, 40 minutes
- At tier 4 (25 min), enemy has been evolving for 25–25 = 0 minutes past tier 3
- Tier 4 unlocks Siege Turtle immediately

**PROBLEM**: If player is slow on military tech, they won't have Catapult by 25 min. Siege Turtle will demolish Towers.

**MITIGATION**:
- Shieldbearer (Iron Shell at 5 min) can tank Siege Turtle hits
- Brawlers are 0.5x weak vs Siege Turtle (halved damage) — so pure Brawler army loses hard
- High pop count + mixed army can overpower, but it's close

**Verdict**: ⚠ **Tier 4 is a tightness point**. Not unfair, but requires player to prioritize military tech or have large army buffer.

---

## F. VETERANCY SYSTEM

### Kill Thresholds and Progression

| Rank | Kills Required | HP Bonus | Damage Bonus | Speed Bonus | ROI |
|------|----------------|----------|--------------|-------------|-----|
| Recruit | 0 | — | — | — | — |
| Veteran | 3 | +10% | +15% | — | Low (3 kills) |
| Elite | 7 | +20% | +25% | +10% | Medium (7 kills) |
| Hero | 15 | +35% | +40% | +15% | High (15 kills) |

**Example: Brawler Veterancy Gains**

| Rank | HP | Damage | Kill Time (vs Gator) |
|------|----|----|------------|
| Recruit | 60 | 6 | 10 hits (10s) |
| Veteran | 66 | 6.9 | 8.7 hits (9s) |
| Elite | 72 | 7.5 | 8 hits (8s) |
| Hero | 81 | 8.4 | 7.1 hits (7.1s) |

**Achievability**:
- **Veteran (3 kills)**: Easy, early game skirmishes
- **Elite (7 kills)**: Moderate, survives first major battle
- **Hero (15 kills)**: Challenging, requires unit to survive multiple battles

**Mid-Game Scenario** (5 min, first evolution):
- Player has 4–5 combat units
- Each kills 1–2 Gators/Snakes in peace period
- 2–3 units should reach Veteran by 5 min ✓
- Elite units appear by 10 min (after second battle) ✓
- Hero units appear by 15+ min (late mid-game) ✓

**Verdict**: ✓ **Veterancy system is well-balanced**. Thresholds are achievable in normal play.

---

## G. COMMANDER IMPACT

### Commander Bonuses

| Commander | Aura | Passive | Unlock |
|-----------|------|---------|--------|
| **Marshal** | +10% damage | None | Default |
| **Sage** | +25% research speed | +15% gather rate | Win 3 games |
| **Warden** | +200 HP buildings | Towers +20% attack speed | Win on Hard |
| **Tidekeeper** | +0.3 speed units | Swimmers -50% cost | 200 pearls |
| **Shadowfang** | -15% enemy damage aura | Traps 2x duration | Zero losses |
| **Ironpaw** | +20% HP units | Shieldbearers 2x faster | 5 Hero units |
| **Stormcaller** | +50% Catapult range | Random lightning | Win Nightmare |

### Aura Effectiveness Analysis

**Marshal (+10% damage aura)**:
- Brawler (6 dmg) → 6.6 dmg
- Sniper (8 dmg) → 8.8 dmg
- Catapult (20 dmg) → 22 dmg
- Modest but steady buff across army

**Sage (+25% research speed)**:
- Tech cost scaling: 200C → 160C equivalent (time-wise)
- Allows earlier access to mid-tier techs
- +15% gather is strong economy buff

**Warden (+200 HP buildings)**:
- Tower (500 → 700 HP) — survives +2 hits vs Gator
- Watchtower (800 → 1000 HP) — survives +2 hits vs Gator
- Significant defensive buff

**Tidekeeper (+0.3 speed)**:
- Base unit speed: 1.4–3.0
- +0.3 is 10–21% increase
- Allows faster response to threats

**Shadowfang (-15% enemy damage aura + 2x trap duration)**:
- Reduces Gator (6 dmg) to 5.1 dmg
- 2x trap duration for Trapper (0-duration base implied → significant buff)
- Defensive playstyle enabler

**Ironpaw (+20% HP + 2x Shieldbearer training)**:
- Brawler (60 → 72 HP)
- Sniper (40 → 48 HP)
- Shieldbearers train at 2x speed (fits tank-focused strat)

**Stormcaller (Catapult +50% range + random lightning)**:
- Catapult (250px → 375px range) — massive siege advantage
- Lightning is situational (fun but not core balance)

### Commander Viability

| Commander | Playstyle | Effectiveness | Notes |
|-----------|-----------|---|-------|
| Marshal | All-rounder | ✓ Balanced | +10% damage is modest but works |
| Sage | Economic | ✓ Strong | +25% research + +15% gather is powerful early |
| Warden | Defensive | ✓ Strong | Building durability is clutch vs Siege Turtle |
| Tidekeeper | Speed-focused | ⚠ Niche | Speed buff + Swimmer cost is nice but narrow |
| Shadowfang | Defensive Trap | ⚠ Niche | -15% enemy damage is weak compared to other bonuses |
| Ironpaw | Tank-focused | ⚠ Niche | +20% HP + 2x Shieldbearer training is OK |
| Stormcaller | Siege-focused | ⚠ Niche | +50% Catapult range is very powerful for siege play |

**Verdict**:
- ✓ **All commanders feel viable**, no dominant choice
- ⚠ **Shadowfang is weakest** (-15% enemy damage is small; 2x traps are niche)
- ✓ **Sage and Warden are strongest** (broad playstyle enablers)

---

## H. GAME PACE

### Peace Timer Duration

| Setting | Value | Implication |
|---------|-------|-------------|
| PEACE_TIMER_FRAMES | 7200 | ~2 minutes at 60fps |
| ENEMY_GATHERER_SPAWN_INTERVAL | 900 | Every 15 seconds |
| WAVE_INTERVAL (after peace) | 1800 | Every 30 seconds |

**Peace Period Analysis**:
- Player has 2 minutes to establish economy
- Likely: Build Armory, train 2 Brawlers, get 1–2 Snipers queued
- Enemy gathers ~8 times (spawns 1 Gatherer every 15s, but costs 50C, so net ~6–7 gatherers by end of peace)
- Enemy starts attacking at ~200 second mark with army of 3–5 units

**Verdict**: ✓ **Peace timer is appropriate**. Enough time to prepare without feeling rushed.

### Time to First Enemy Contact

From peace end (~2 min) to first meaningful attack:
- Minute 2–2.5: First enemy patrol/scout units present
- Minute 2.5–3: Small skirmish (1–2 Gators vs player units)
- Minute 3–4: Coordinated attack (5+ units) if player is unprepared

**Verdict**: ✓ **Pacing is good**. Natural build up to first battle.

### Average Game Length (Estimated)

| Difficulty | Player Win Time | Enemy Strength Peak |
|-----------|-----------------|-------------------|
| Easy | 10–15 min | Tier 2–3 |
| Normal | 15–25 min | Tier 3–4 |
| Hard | 25–35 min | Tier 4–5 |
| Nightmare | 35–50 min | Tier 5+ |

**Verdict**: ✓ **Game pacing feels appropriate** for an RTS. Mid-game can slow if economy stalls, but combat keeps things engaging.

---

## SUMMARY OF BALANCE ISSUES

### Critical Issues (Fix ASAP)

1. **None found** — game is fundamentally sound

### High Priority Issues (Should Fix)

1. **Siege Turtle at 25 minutes is a tight skill gate**
   - Requires Catapult tech or Shieldbearer to counter
   - If player hasn't researched Siege Works by 25 min, will struggle
   - **Fix**: Either reduce Tier 4 threshold to 20 min (give more time) OR reduce Siege Turtle health from 300 to 250 HP OR increase player tech availability

2. **Scout unit is extremely expensive for its utility**
   - Cost: 50C for 20 HP, 1 damage unit
   - Used only for fog of war reveals
   - **Fix**: Reduce cost to 35C OR increase speed to 3.5 (currently 3.0)

3. **Trade Routes tech provides poor ROI**
   - Cost: 200C 150T for +36 clams/min per Lodge
   - Break-even: 3.3 minutes (too slow)
   - **Fix**: Increase to +5 clams/5sec (+60C/min) to break even at 2.5 minutes

### Medium Priority Issues (Nice-to-Have)

1. **Healer cost-efficiency is hard to quantify**
   - No direct damage output, heal rate unclear from config
   - Costs 60C 40T but feels situational
   - **Fix**: Check heal rate; if <5 HP/frame, increase to 5 HP/frame OR reduce cost to 50C 30T

2. **Watchtower might be expensive**
   - Cost: 400C 350T (2.3x Tower cost)
   - DPS increase: 15 vs 10 (1.5x)
   - Range increase: 280 vs 200 (40% more)
   - **Assessment**: Probably fair, but monitor in late-game builds

3. **Pearl economy is delayed**
   - Takes 8–10 min to access first pearl tech
   - Most pearl-gated techs are not essential (Hardened Shells is nice but not critical)
   - **Assessment**: This is OK — creates mid/late-game progression gates

### Low Priority Issues (Polish)

1. **Shadowfang commander (-15% enemy damage) is weak**
   - Other commanders have broader impact
   - **Fix**: Increase to -20% OR add secondary passive

2. **Aquatic Training (Swimmer) has limited use**
   - Swimmer speed (2.8) is fast but cost (60C 30T) is reasonable
   - Main issue: Most maps don't have enough water to exploit Swimmer advantage
   - **Assessment**: Map-dependent, not a config issue

---

## RECOMMENDED BALANCE CHANGES

### Immediate Fixes (Ship Next Patch)

```typescript
// 1. Scout cost reduction (safety nerf)
[EntityKind.Scout]: {
  clamCost: 35,  // was 50
  // ... rest unchanged
}

// 2. Trade Routes buff (double the passive income)
tradeRoutes: {
  // description: '+6 clams/5sec passive income per Lodge' (was '+3 clams/5sec')
  // Cost stays 200C 150T (now 2.5 min ROI instead of 3.3 min)
}

// 3. Siege Turtle slight nerf (reduce HP to reduce overkill damage)
[EntityKind.SiegeTurtle]: {
  hp: 250,  // was 300
  // ... rest unchanged (still 25 damage, 3x multiplier)
}
```

### Secondary Improvements (Next 2 Weeks)

```typescript
// 4. Healer buff (check heal rate; if needed, reduce cost)
[EntityKind.Healer]: {
  clamCost: 50,  // was 60
  twigCost: 30,  // was 40
  // Health regen system should tick at 5 HP/frame (verify)
}

// 5. Shadowfang commander buff
shadowfang: {
  auraDesc: 'Enemies in range -20% damage',  // was -15%
  auraEnemyDamageReduction: -0.2,  // was -0.15
  // Passive stays the same (2x traps)
}

// 6. Tidekeeper commander slight buff (makes niche playstyle more viable)
tidekeeper: {
  auraDesc: '+0.4 speed to all units',  // was +0.3
  auraSpeedBonus: 0.4,  // was 0.3
}
```

### Optional Late-Game Improvements (Polish)

```typescript
// 7. Watchtower slight cost reduction (currently feels fair, but can reduce by 5%)
[EntityKind.Watchtower]: {
  clamCost: 380,  // was 400
  twigCost: 330,  // was 350
}

// 8. Tier 4 Evolution timing adjustment (move from 25 min to 20 min, gives player more preparation time)
// In evolution.ts:
const THRESHOLDS = [5, 10, 15, 20, 40];  // was [5, 10, 15, 25, 40]
```

---

## VALIDATION CHECKLIST

Before shipping any changes, verify:

- [ ] Siege Turtle nerf doesn't make it underpowered (still should 2-3 shot towers)
- [ ] Scout cost reduction doesn't break fog of war economy (still situational)
- [ ] Trade Routes buff makes it a real choice vs military techs (ROI < 3 min now)
- [ ] Healer cost reduction makes healing-focused composition viable (supports Shieldbearer tanks)
- [ ] Tidekeeper buff makes speed playstyle fun but not dominant (unit speedboost is still modest)
- [ ] Run full 10-game balance suite at each difficulty to ensure no new degenerate strategies emerge
- [ ] Tier 4 timing change (if applied) doesn't spike difficulty too early

---

## CONCLUSION

**Overall Assessment**: **B+ (Very Good)**

Pond Warfare has excellent foundational balance. The unit counter system is the standout feature — it creates meaningful strategic decisions without feeling arbitrary. The tech tree branching is diverse, and the resource economy scales well from early to late game.

**Strengths**:
1. Counter system forces mixed armies ✓
2. Resource economy is healthy and scaling ✓
3. Veterancy thresholds are achievable ✓
4. Tech tree has genuine branching (not linear) ✓
5. Enemy evolution timing is mostly appropriate ✓

**Weaknesses**:
1. Scout unit is overpriced for its utility ⚠
2. Siege Turtle at 25 min is a skill gate (tight but fair) ⚠
3. Trade Routes provides poor ROI ⚠
4. Pearl economy is delayed (not a problem, but worth noting) ⚠

**Recommended Action**: Apply the 3 immediate fixes (Scout cost, Trade Routes buff, Siege Turtle HP). These are low-risk, high-clarity changes that improve player agency without breaking balance.
