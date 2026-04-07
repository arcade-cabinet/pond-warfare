# Unit Model

This document is the canonical human-readable unit-model reference for Pond Warfare as of April 7, 2026.

The machine-readable counterpart is [configs/unit-model.json](/Users/jbogaty/src/arcade-cabinet/pond-warfare/configs/unit-model.json). If prose and runtime assumptions diverge, that config plus this doc should be treated as the intended source of truth.

It supersedes the older mixed model where:

- `Gatherer`, `Fighter`, and `Scout` were separate baseline generalists
- Pearl upgrades spawned free auto-deploy specialist bodies at match start
- some docs treated `Sapper` and `Saboteur` as manual units while others treated them as Pearl specialists

## Core Rule

The baseline run must stay technically playable through the first exposure to stages 1 through 6 without spending Clams or Pearls.

That baseline roster is intentionally compact. New panel pressure unlocks new responses only when the battlefield actually demands them.

## Manual Units

These are the normal-run units the player trains and controls directly.

| Unit | Unlock Stage | Role |
|------|--------------|------|
| `Mudpaw` | 1 | Baseline manual generalist. Gathers, fights, scouts, builds, repairs. |
| `Medic` | 2 | Manual healing/support response once logs and repair pressure enter the run. |
| `Sapper` | 5 | Manual siege/demolition response once rocks, fortifications, and flank pressure enter the run. |
| `Saboteur` | 6 | Manual subversion/disruption response once the full six-panel pressure set is active. |

### Mudpaw

`Mudpaw` replaces the older split baseline model of `Gatherer + Fighter + Scout`.

The point of the consolidation is:

- fewer dead-weight worker bodies after the first economy burst
- stronger value from Clam upgrades on one reusable manual chassis
- cleaner panel progression because new resources do not imply spawning disposable resource-only units

Clam upgrades should tune the Mudpaw's run-scoped effectiveness:

- gather speed and carry
- build and repair speed
- fog/sight radius
- survivability and field utility

## Pearl Specialists

Pearls unlock specialist blueprints, autonomy, and specialist growth. They should not function as free godmode bodies.

| Specialist | Domain | Behavior |
|------------|--------|----------|
| `Fisher` | Economy | Autonomous fish harvesting in an assigned area |
| `Logger` | Economy | Autonomous log harvesting in an assigned area |
| `Digger` | Economy | Autonomous rock harvesting in an assigned area |
| `Guard` | Combat | Autonomous infantry defense/offense in an assigned area |
| `Ranger` | Combat | Autonomous ranged coverage in an assigned area |
| `Bombardier` | Combat | Autonomous siege support in an assigned area |
| `Shaman` | Support | Autonomous healing in an assigned area |
| `Lookout` | Recon | Autonomous scouting/vision patrol in an assigned area |

## Specialist Control Model

Pearl specialists follow a different control model from manual units:

- Pearls unlock the right to train the specialist during a match
- the player still pays in-match resources to spawn the specialist
- once spawned, the specialist is autonomous by default
- the player can still select and reposition the specialist
- the specialist is assigned to a terrain area, not a single target
- that area defines the specialist's Yuka-governed operating radius
- within that radius, the specialist searches for work matching its role
- a temporary direct move/reposition is allowed, but the specialist should fall back to its assigned radius behavior afterward

Examples:

- assign a `Fisher` to a shoreline radius and it continuously works nearby fish nodes
- assign a `Shaman` to a frontline radius and it heals wounded units in that zone
- assign a `Bombardier` to a siege radius and it looks for valuable pressure targets in that zone

## Pearl Upgrade Philosophy

Pearl specialist progression should scale specialist capability, not bypass gameplay.

Preferred Pearl tracks:

- unlock specialist blueprint
- specialist cap or deployment slot count
- operating radius
- throughput or efficiency
- durability or survivability

## Radius As A Core Upgrade Path

Radius is not a cosmetic detail. It is one of the main ways Pearl specialists grow.

- early ranks should feel intentionally local and limited
- later ranks should let one specialist stabilize a larger portion of the battlefield
- bigger radius should improve coverage, but not erase the need for unit count, positioning, or resource spend
- the player should understand that placing the radius well matters just as much as unlocking the specialist

Examples:

- a low-rank `Fisher` may only cover one shoreline pocket efficiently, while a later-rank `Fisher` can work a wider fishing lane
- a low-rank `Shaman` may only hold one frontline skirmish together, while a later-rank `Shaman` can sustain a broader defensive area
- a low-rank `Bombardier` may only pressure one fort lane, while a later-rank `Bombardier` can meaningfully support a wider siege corridor

Preferred non-specialist Pearl tracks:

- permanent Lodge-side automation that does not replace required baseline play
- starting tier shortcuts
- long-run earnings and pacing modifiers

## What Is Obsolete

The following older assumptions are obsolete and should be removed over time from docs and runtime:

- free match-start auto-deploy as the primary Pearl specialist model
- `Gatherer`, `Fighter`, and `Scout` as separate baseline manual units
- `Guardian` and `Hunter` as the primary autonomous combat split
- any design that gates a required first-clear building or response behind Clams
