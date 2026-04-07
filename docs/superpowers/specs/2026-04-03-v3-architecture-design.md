# Pond Warfare v3.0 — Architecture Design Spec

> Unit-model note, April 7, 2026:
> The unit split described in this spec is now historical context. The canonical current design lives in [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md), which supersedes the older `Gatherer/Fighter/Scout + free auto-deploy specialist` framing.

## Vision

A mobile-first RTS where every match is a dense 5-25 minute battle on a compact vertical map. Your Lodge sits at the bottom. Enemies come from the top. Between matches, a deep procedural upgrade web and prestige system provide infinite replayability. Automation is EARNED through prestige, not toggled in settings. Everything is data-driven via JSON configs.

**Design philosophy:** "Small and dense. Every tap matters. Automation is a reward."

---

## 1. Core Loop

```
TAP "PLAY"
  → Match starts (Lodge at bottom, calibrated to your progression)
  → Gather fish/rocks/logs → Train units → Fight waves → React to events
  → Win (destroy threat) or Lose (Lodge falls)
  → Rewards screen (Clams earned based on performance)
  → Upgrade web (spend Clams on permanent boosts)
  → TAP "PLAY" again

When progression slows → "RANK UP" button pulses
  → Prestige: reset upgrades, earn Pearls (secondary currency)
  → Pearl upgrades = permanent multipliers that survive prestige
  → Start fresh but FASTER → reach further → prestige again
```

No match timer. No difficulty selection. No mode selection. One button: PLAY. Your save file determines everything.

---

## 2. In-Match Design

### 2.1 Map

- **Vertical orientation.** Lodge fixed at bottom of screen, enemies from top.
- **~1 screen wide, 2-3 screens tall.** Minimal panning needed.
- **Map size scales with progression.** New player: tiny arena. Veteran: full battlefield with flanking routes.
- **Resource nodes** scattered in the middle zone between Lodge and enemy spawn.
- **Chokepoints** for wall/tower placement emerge naturally from terrain.

### 2.2 Resources (In-Match Only)

| Resource | Source | Purpose |
|----------|--------|---------|
| **Fish** | Water nodes | Train units (food) |
| **Rocks** | Rock deposits | Build/upgrade fortifications |
| **Logs** | Tree clusters | Repair Lodge and structure damage |

No abstract currencies in-match. Three tangible materials with obvious uses.

### 2.3 Units — Manual/Prestige Pattern

Every capability has a manual generalist and prestige-unlocked specialists. Every player action has an enemy counterpart.

| Domain | Manual Unit | Prestige Auto Unit(s) | Enemy Counterpart |
|--------|------------|----------------------|-------------------|
| **Gather** | Gatherer (collects any resource you send them to) | Fisher (auto-fish), Digger (auto-rocks), Logger (auto-logs) | Raiders (attack resource nodes) |
| **Combat** | Fighter (attacks what you target) | Guardian (auto-defend Lodge), Hunter (auto-attack nearest), Ranger (auto-patrol) | Enemy fighters, flankers |
| **Heal** | Medic (heals who you send them to) | Shaman (auto-heals nearest wounded) | Enemy healers |
| **Scout** | Scout (reveals where you send them) | Lookout (auto-patrols fog edges) | Enemy scouts (detect your army) |
| **Fortify** | Tap to place wall/tower (costs Rocks) | Auto-Battlements (auto-build at chokepoints) | Enemy siege units (break walls) |
| **Repair** | Spend Logs at Lodge manually | Auto-Repair (Lodge self-heals) | Enemies target damaged structures |
| **Siege** | Sapper (demolish enemy forts) | Auto-Siege (catapults on towers) | Enemy sappers (breach your walls) |
| **Subvert** | Saboteur (poison node, disable tower) | Auto-Sabotage (agents auto-infiltrate) | Enemy saboteurs (corrupt your nodes) |

**New player starts with:** Gatherer, Fighter, Medic, Scout. Four manual unit types. Everything by hand.

**Prestige veterans have:** All generalists PLUS specialists that automate grunt work, freeing attention for strategy and events.

### 2.4 Lodge

- **Fixed at screen bottom.** Always visible. Never scroll to find it.
- **Visual representation of progression.** Wings/features appear based on upgrades purchased.
- **Tap Lodge → radial menu:** train available units, fortify (if Rocks available), repair (if Logs available).
- **Lodge takes damage from enemy waves.** If Lodge HP reaches 0, match is lost.
- **Fortifications attach to Lodge area.** Pre-defined fort slots radiate outward from Lodge (like a tower defense). Tap an empty slot → spend Rocks → wall/tower appears. Slots unlock as map size grows with progression. Not free-placement anywhere — structured positions that create defensive layers.
- **Prestige rank changes Lodge appearance.** Higher ranks = more imposing base.

### 2.5 Controls (Tap-First)

Three interactions:

1. **Tap Lodge** → Radial menu: Train units, Fortify, Repair
2. **Tap unit/group** → Radial menu: contextual actions (Gather, Attack, Heal, Hold, Patrol, Demolish)
3. **Tap terrain/enemy/resource** → Selected units move there / attack / gather

**No panels. No sidebars. No accordions. No modals during gameplay.**

HUD:
- **Top bar:** Fish / Rocks / Logs counts + wave/event indicator
- **Bottom:** Lodge (always visible, tappable)
- Everything else is the battlefield.

### 2.6 Events (PRNG-Driven)

Events replace campaigns, puzzles, and survival mode. They fire during any match based on PRNG seed + progression level.

Event types (from JSON config):
- **Wave:** enemies spawn from direction(s) — early: top only, late prestige: all sides
- **Boss:** powerful enemy appears with warning. Optional kill for big Clam reward.
- **Resource Surge:** rich node spawns temporarily. Race to harvest.
- **Storm:** weather effect (slow units, reduce vision) for N seconds.
- **Escort:** friendly NPC caravan crosses map. Protect for bonus.
- **Siege:** concentrated enemy push with sappers targeting walls.
- **Sabotage:** enemy saboteur spotted heading for your resource node.
- **Swarm:** massive wave of weak enemies. Quantity over quality.

Event pool, frequency, and difficulty all scale with progression level. New players see simple waves. Veterans face multi-event storms.

---

## 3. Between-Match Progression

### 3.1 Clams (Primary Currency)

- Earned post-match. Amount based on: kills, resources gathered, events completed, survival time.
- Spent on the Upgrade Web.
- **Resets on prestige.**

### 3.2 Upgrade Web (Procedural)

**Not a handcrafted tree. A formula-generated web.**

**Structure:**
- ~6 categories: Gathering, Combat, Defense, Speed, Production, Utility
- ~4 subcategories each = ~24 upgrade paths
- 10 tier prefixes per path = ~240 scaling upgrades
- ~30-50 diamond nodes where paths converge

**Tier Prefixes (power scaling):**
Basic → Enhanced → Super → Mega → Ultra → Seismic → Colossal → Legendary → Mythic → Transcendent

**Example path (Gathering > Fish Rate):**
- Basic Fish Gathering: +5% fish rate (cost: 10 Clams)
- Enhanced Fish Gathering: +10% fish rate (cost: 20 Clams)
- Super Fish Gathering: +15% fish rate (cost: 40 Clams)
- ... escalating logarithmically to ...
- Transcendent Fish Gathering: +50% fish rate (cost: 10,240 Clams)

**Diamond Nodes (convergence unlocks):**
When two paths reach minimum tiers, a special unlock appears:

```json
{
  "id": "fisher_specialist",
  "name": "Fisher Training",
  "requires": [
    { "category": "gathering", "sub": "fish_rate", "min_tier": 3 },
    { "category": "production", "sub": "train_speed", "min_tier": 2 }
  ],
  "effect": "Unlock Fisher specialist unit"
}
```

Other diamond examples:
- Combat.melee_damage T3 + Speed.swiftness T2 → "Berserker Fury" (damage scales with missing HP)
- Defense.building_hp T3 + Utility.healing T2 → "Fortress Protocol" (buildings auto-repair)
- Gathering.rock_rate T3 + Defense.wall_strength T2 → "Master Mason" (walls cost 50% less)
- Combat.ranged_damage T3 + Utility.vision T2 → "Eagle Eye" (ranged units +30% range)

**Lodge Wings are diamond nodes:**
- Gathering T5 (any sub) → "Dock Wing" — Lodge visual expands with dock
- Combat T5 (any sub) → "Barracks Wing" — Lodge visual expands with barracks
- Defense T5 (any sub) → "Watchtower" — Lodge visual expands with tower
- Utility T5 (any sub) → "Healing Pool" — Lodge visual expands with pool

### 3.3 Prestige (Rank Up)

When progression slows (upgrade costs outpace Clam income), a "RANK UP" button pulses.

**On prestige:**
- All Clam upgrades reset
- Earn Pearls: `pearls = floor(progression_level * rank_multiplier)`
- Rank increases by 1
- Game difficulty, map size, event variety all increase slightly

**Pearl Upgrades (persist forever):**

| Upgrade | Effect | Max Rank |
|---------|--------|----------|
| Auto-Deploy Fisher | Spawn N fishers at match start | 10 |
| Auto-Deploy Digger | Spawn N diggers at match start | 10 |
| Auto-Deploy Logger | Spawn N loggers at match start | 10 |
| Auto-Deploy Soldier | Spawn N soldiers at match start | 5 |
| Auto-Gather | Specialist gatherers auto-return to nearest resource | 1 |
| Auto-Defend | Guardians auto-engage threats near Lodge | 1 |
| Auto-Heal | Shamans auto-heal nearest wounded | 1 |
| Auto-Patrol | Lookouts auto-patrol fog edges | 1 |
| Auto-Battlements | Forts auto-build at chokepoints when Rocks available | 1 |
| Auto-Repair | Lodge self-repairs when Logs available | 1 |
| Auto-Siege | Towers auto-fire at approaching enemies | 1 |
| Auto-Sabotage | Agents auto-infiltrate enemy nodes | 1 |
| Clam Multiplier | +X% Clams earned per match | 10 |
| Starting Resources | Begin matches with bonus fish/rocks/logs | 10 |
| Lodge Armor | Lodge starts with +X% HP | 10 |
| Unit Stats | All units +X% HP and damage | 10 |

---

## 4. Data Architecture

### 4.1 JSON Config Schema

ALL game content defined in JSON. TypeScript is engine only.

```
configs/
  units.json          — unit definitions (stats, role, cost, auto-behavior)
  events.json         — event templates (type, difficulty range, rewards, enemy composition)
  upgrades.json       — upgrade web definition (categories, subs, scaling formulas, diamond nodes)
  prestige.json       — prestige upgrades (auto-deploy, auto-behavior, multipliers)
  lodge.json          — Lodge wing definitions (visual, gameplay effect, unlock condition)
  terrain.json        — map generation params per progression level
  enemies.json        — enemy unit types + scaling formulas
  fortifications.json — wall/tower types, costs, stats
  rewards.json        — post-match reward formulas
  prefixes.json       — tier name prefixes + scaling multipliers
```

### 4.2 SQLite Schema

```sql
-- Persists forever
CREATE TABLE player_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  rank INTEGER DEFAULT 0,           -- prestige level
  pearls INTEGER DEFAULT 0,         -- prestige currency
  pearl_upgrades TEXT DEFAULT '{}',  -- JSON: purchased pearl upgrades
  total_matches INTEGER DEFAULT 0,
  total_clams_earned INTEGER DEFAULT 0,
  highest_progression INTEGER DEFAULT 0
);

-- Resets on prestige
CREATE TABLE current_run (
  id INTEGER PRIMARY KEY DEFAULT 1,
  clams INTEGER DEFAULT 0,
  upgrades_purchased TEXT DEFAULT '{}', -- JSON: upgrade web state
  lodge_state TEXT DEFAULT '{}',        -- JSON: visual Lodge state
  progression_level INTEGER DEFAULT 0,
  matches_this_run INTEGER DEFAULT 0
);

-- Match history (append-only)
CREATE TABLE match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  result TEXT,          -- 'win' | 'loss'
  duration_seconds INTEGER,
  kills INTEGER,
  clams_earned INTEGER,
  events_completed INTEGER,
  progression_level INTEGER,
  rank INTEGER
);
```

### 4.3 Config-Driven Engine

The TypeScript engine reads configs and executes:

```
JSON configs
    ↓
Config Loader (validates schemas, resolves references)
    ↓
ECS World (entities created from unit/enemy configs)
    ↓
Systems (combat, gathering, events — all read config values, not hardcoded)
    ↓
Renderer (Lodge appearance from lodge.json + upgrade state)
    ↓
UI (minimal HUD, radial menus, upgrade web screen)
```

Adding a new unit type = edit units.json. Adding a new event = edit events.json. Zero TypeScript changes for content.

---

## 5. What Gets Cut

| Current System | Replacement |
|---------------|-------------|
| Tech tree modal (25 in-game techs) | Between-match upgrade web (240+ procedural upgrades) |
| Advisor system (3 advisors, tips) | Cut entirely. Learn by playing. |
| Campaign mode (10 missions) | Events absorb mission content (boss fights, escorts, sieges) |
| Puzzle mode (20 puzzles) | Cut. Events provide variety. |
| Survival mode | Every match IS survival. |
| Difficulty selection (5 levels) | Progression level IS difficulty. |
| New Game modal (50+ options) | One button: PLAY. |
| Command panel sidebar | Cut. Tap Lodge for radial. |
| Accordion UI | Cut. No panels needed. |
| Auto-behavior toggles | Automation earned via prestige. |
| Building placement (Armory, etc.) | Lodge evolves from upgrades. Fortify contextually with Rocks. |
| Multiple game modes | One mode. Events create variety. |
| Match length timer | No timer. Game ends when it ends. |

---

## 6. Migration Path

### Phase 1: JSON Config System
- Create config/ directory with JSON schemas
- Build config loader with validation
- Migrate unit defs from TypeScript to units.json
- Migrate enemy defs to enemies.json
- Engine reads from configs instead of imports

### Phase 2: Map & Lodge Rework
- Vertical map with Lodge at bottom
- Lodge rendering from config + upgrade state
- Remove building placement system
- Add fortification system (Rocks → walls/towers near Lodge)

### Phase 3: Simplified Units
- Implement 4 generalist units (Gatherer, Fighter, Medic, Scout)
- Implement radial action menu
- Replace sidebar command panel with tap-to-interact
- Fish/Rocks/Logs resource system

### Phase 4: Upgrade Web
- Build procedural upgrade generator from JSON config
- Upgrade web UI (between-match screen)
- Diamond node resolution
- Lodge wing visual system

### Phase 5: Prestige System
- Rank up flow
- Pearl currency + pearl upgrades
- Specialist unit unlocks via prestige
- Auto-deploy at match start
- Auto-behavior unlocks

### Phase 6: Events System
- Migrate campaign/puzzle content to event templates
- PRNG event selection during matches
- Event difficulty scaling with progression
- Event variety scaling with prestige rank

---

## 7. Success Criteria

| Metric | Target |
|--------|--------|
| Tap PLAY to in-match | < 2 seconds |
| Average match length | 5-15 minutes |
| Time to first prestige | ~3-5 hours of play |
| Unique upgrade paths | 240+ from formulas |
| Diamond nodes | 30-50 convergence unlocks |
| JSON config files | 9 (zero hardcoded content in TS) |
| In-match UI elements | Resource bar + Lodge. No panels. |
| Unit types at start | 4 manual generalists |
| Unit types at max prestige | 4 generalists + 12 specialists |
| Controls | 3 tap types: Lodge, unit, terrain |
