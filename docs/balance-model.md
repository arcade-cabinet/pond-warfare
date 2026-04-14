---
title: Balance Model
updated: 2026-04-10
status: current
domain: product
---
# Balance Model

This document now measures a mixed runtime: the player-facing game uses Pearl specialist blueprint caps plus in-match specialist training, while some diagnostics still use the specialist snapshot harness as a controlled measurement tool. The canonical target model is [docs/unit-model.md](unit-model.md), where operating radius is a primary upgrade axis. The live prestige config now also includes direct specialist-zone rows for `operating_radius`, `anchor_radius`, `engagement_radius`, and `projection_range`.

## Purpose

Pond Warfare needs a balance model that can answer three questions:

1. What is the baseline pressure curve of a no-upgrade run?
2. How much does each Clam track reduce effective difficulty?
3. How much does each Pearl track reduce effective difficulty?

The goal is not perfect prediction. The goal is a repeatable approximation we can use to tune:

- Clam rewards per match
- Pearl rewards per rank-up
- Upgrade costs
- Upgrade effect sizes

## Core Rules

- The baseline game must be technically playable through the first exposure to all six panel stages without spending Clams or Pearls.
- Clams are a current-run pressure-relief layer.
- Pearls are the permanent prestige acceleration layer.
- Player-facing Pearl specialists now cost in-match resources and consume normal population when trained during a run.
- Player-facing Pearl specialist zone upgrades now apply at spawn time into their assignment geometry, not just their display copy.
- Enemy counter-training now keys off actual player combat pressure. `Mudpaw`
  economy bodies are intentionally excluded from that signal so small Clam
  economy upgrades do not get "countered" as if they were frontline army tech.
- The specialist snapshot harness still excludes those spawned specialists from baseline food-cap accounting so older pressure slices remain comparable while the harnesses are being rewritten.
- If a building or response is required to clear a pane, it belongs in baseline pane progression, not behind Clams.

## Current Model

Implemented in [progression-model.ts](../src/balance/progression-model.ts).

### 1. Baseline Pressure

Baseline pressure is modeled as:

`stage_pressure * match_pressure`

Where:

- `stage_pressure = 1 + (panelStage - 1) * 0.4`
- `match_pressure = 1 + log2(matchNumber) * 0.55`

This gives:

- discrete pressure jumps when the map expands to a new pane
- a logarithmic difficulty rise across successive matches in the same run

### 2. Observed Power Score

A governor-run scenario is converted into a normalized player-power score from:

- resources gathered
- units trained
- kills
- living player units
- remaining Lodge HP ratio

Large raw counts are compressed with logarithms so one metric does not dominate the result.

There is also now a scenario-specific sustain score for developed defensive
holds. That score weights:

- enemy kills
- surviving player unit count
- retained player-unit HP ratio
- remaining Lodge HP ratio

This is intentionally narrower than the general power score. It exists for
Pearl tracks like `hp_multiplier`, `auto_heal_behavior`, and
`auto_repair_behavior`, whose value is easy to under-read if the scenario ends
before a real defending army is already established.

### 3. Observed Economy Score

The model separately tracks post-match Clam output from the same run:

- match reward Clams from the current snapshot
- including prestige rank and earnings multipliers

This catches progression tracks that accelerate the metagame without obviously
changing the first match's battlefield state.

### 4. Meta Progression Score

The combined progression score is:

`power_score + economy_score`

This gives us three lenses for every upgrade track:

- observed in-match power
- observed post-match economy
- combined meta progression

### 5. Difficulty Shift

For any upgrade variant:

`difficulty_shift_pct = (variant_performance - baseline_performance) / baseline_performance`

Positive values mean the upgrade reduced effective difficulty.

The exhaustive report also records a `budget_pct` when the config directly
defines a percentage multiplier. That is not an observed result. It is a raw
stat budget from the upgrade definition. When `budget_pct` is positive but the
observed power/economy shift is near zero, that indicates either:

- the runtime consumer is still missing
- the governor path does not exploit the upgrade
- the measurement window is too short or too coarse

## Current Diagnostic Snapshot

From [balance-track-shifts.test.ts](../tests/e2e/balance-track-shifts.test.ts), stage 6, 1800 frames, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| clam_gather_t1 | 0.00 | 0.11 | 0.33 |
| clam_yield_t1 | 0.21 | 0.32 | 0.42 |
| clam_clam_bonus_t1 | 0.16 | 0.16 | 0.16 |
| pearl_clam_earnings_rank_1 | 0.36 | 0.38 | 0.42 |
| pearl_gather_rank_2 | 0.00 | 0.14 | 0.33 |
| pearl_blueprint_fisher | 0.00 | 0.00 | 0.00 |
| pearl_starting_tier_1 | 0.44 | 0.88 | 1.57 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The broad score now also credits retained in-match stockpile and surviving
mobile-army HP instead of only raw gathered count, trained count, kills, unit
count, and Lodge HP. That makes the Pearl long-run scan more honest for
durability and economy-buffer tracks.

The diagnostic now also includes the controller/runtime fixes for gather
override persistence, specialist governor lockout, prestige population
accounting, the combat counter-scaling fix, governor attack-party reuse, safer
governor attack pacing, bottom-row-only rare resource placement, deterministic
match-event bonus-node placement, transient training-queue reset on fresh world
creation, deterministic seeded weather in `createTestWorld()`, attaching the
`TaskOverride` ECS component to spawned units, and a shared mocked
`game.world` reference across the balance harness files.

The latest correction is bigger than the earlier bookkeeping fixes: the
balance/governor harnesses now share
[tests/helpers/run-sim-frame.ts](../tests/helpers/run-sim-frame.ts),
which runs the live defensive stack instead of a stripped-down loop. That
means the reports now include `buildingSystem`, `fortificationTickSystem`,
`projectileSystem`, and `shamanHealSystem` in the same frame flow as the live
game. This materially changed the stage-6 numbers and removed another class of
false negatives from the balance reports.

## Exhaustive Broad Reports

The old combined exhaustive report turned out to be order-sensitive: running
Pearl rows before Clam rows or vice versa materially changed the output. The
root causes were test/runtime state leaking across runs, especially a stale
global training queue map and per-file `@/game` mocks that did not share the
same mocked `game.world` reference.

The broad scan is now split into isolated files so each currency layer runs in
a fresh worker process:

- [tests/e2e/exhaustive-clam-balance-report.test.ts](../tests/e2e/exhaustive-clam-balance-report.test.ts)
- [tests/e2e/exhaustive-pearl-balance-report.test.ts](../tests/e2e/exhaustive-pearl-balance-report.test.ts)

The Pearl broad scan still reports two horizons:

- opening window: 1200 frames, which is useful for early pacing and early-expression Pearl impact
- long-run window: 2400 frames, which is needed for combat and repair/heal tracks that do not fully express before the first army exists

Those broad Pearl reports still bias toward blueprint-cap and multiplier rows.
The new specialist-zone upgrades are live in the runtime and covered by unit/UI
tests, but they are not yet exhaustively budgeted in the broad report tables.
That is now a measurement gap, not a missing runtime consumer.

Current isolated readout:

- Clam T1:
  - the old frame-zero exhaustive scan has now been replaced by a post-match purchase loop
  - the Clam broad report now does: warmup match to earn real Clams, buy one T1 node between matches, then score the next match
  - in that real between-match loop, the first current-run relief rows are directionally correct:
    - `economy_node_yield_t0` lands around `0.56%` `meta_mean_pct`
    - the three basic gather rows land around `0.38%`, with about `0.81%` `economy_mean_pct`
    - `economy_clam_bonus_t0` lands around `0.15%`, with about `0.99%` `economy_mean_pct`
  - most other T1 rows are currently flat in this harness instead of falsely negative, which is a better read but still tells us many categories are not expressing enough value in the immediate next-match window
- Frontier Expansion path:
  - [tests/e2e/frontier-progression-report.test.ts](../tests/e2e/frontier-progression-report.test.ts) now runs the actual prestige-cycle frontier ladder: earn Clams at the current stage, buy the next required path and Frontier diamond when affordable, then score the first match at the newly unlocked stage
  - the earlier extreme negative Frontier readout was contaminated by a diagnostic bug: it was comparing stage-entry runs against a stage-1 baseline instead of a fresh same-stage baseline
  - in the current live-stack 30-second lens, mean total matches to first exposure are about `2` for stage 2, `7` for stage 3, `13.67` for stage 4, `20.67` for stage 5, and `34.33` for stage 6
  - corrected stage-entry relief is now near-neutral overall: `Frontier Expansion I` lands around `-0.41%` `meta_mean_pct`, `II` around `+0.06%`, `III` around `+0.16%`, `IV` around `-0.46%`, and `V` around `+0.08%`
  - all five stage-entry rows still survive the next match at `100%` across seeds, so the baseline rule is intact; the remaining issue is light under-budget expression on the early/late edge steps, not hard progression failure
- Pearl rank 1:
  - opening window, 1200 frames:
    - the opening slice is still not a release-budget signal; it is a fast early-expression check
    - the strongest early specialist-cap rows are now the frontline Pearl specialists, with `blueprint_guard` leading and `blueprint_fisher` also positive
    - `hp_multiplier` is mildly positive around `0.54%`
    - `gather_multiplier`, `combat_multiplier`, and `auto_heal_behavior` are still effectively flat here
    - the worst opening-window Pearl rows are now `blueprint_logger` and `blueprint_digger`, both materially negative in this short slice
  - long-run window, 2400 frames:
    - the strongest long-run Pearl specialist rows are now `blueprint_guard`, `blueprint_ranger`, and `blueprint_shaman`
    - `starting_tier` is about `0.70%`
    - `hp_multiplier` is about `0.47%`, `gather_multiplier` about `0.38%`, `combat_multiplier` about `0.32%`, and `auto_heal_behavior` about `0.14%`
    - `clam_earnings_multiplier` remains economy-led, with about `2.19%` `economy_mean_pct` and about `0.35%` `meta_mean_pct`
    - `blueprint_fisher` is only near-neutral in the long-run broad scan at about `0.04%`
    - the main still-negative long-run Pearl rows are `blueprint_logger` around `-3.60%`, `blueprint_digger` around `-3.88%`, plus smaller negatives on `rare_resource_access` and `blueprint_lookout`

## Combat-Pressure Diagnostic

From [tests/e2e/pearl-combat-pressure-diagnostics.test.ts](../tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | 0.35 | 0.64 | 1.20 |
| hp_multiplier | 1.91 | 2.00 | 2.05 |
| auto_heal_behavior | 2.68 | 2.97 | 3.11 |
| auto_repair_behavior | 3.18 | 3.18 | 3.18 |

This is not a tuning success. It is a diagnostic finding:

- `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are now all clearly positive under pressure
- `auto_repair_behavior` remains positive and now edges out the direct damage track in this specific setup
- this still confirms the direct combat runtime and local defensive expression are working better than the blended stage-6 exhaustive report suggests, even though the gains are now more modest under the safer governor pacing
- the remaining negative blended full-run rows now point more strongly at governor pathing and long-window decision policy than at missing damage/heal consumers

## Sustain Diagnostic

From [tests/e2e/pearl-sustain-diagnostics.test.ts](../tests/e2e/pearl-sustain-diagnostics.test.ts), a developed home-defense hold with a pre-existing wounded army and repeated enemy assault waves:

This harness is intentionally not a release-budget baseline. It is an
expression harness that answers a narrower question: once the player already
has a damaged defending army near the Lodge, do the sustain-oriented Pearl
tracks actually help?

Current reading:

- `auto_repair_behavior` and `auto_heal_behavior` are clearly real and strongly expressed in the scenario they are meant to help. In this narrow hold scenario they now show triple-digit mean lift, so the main takeaway is expression, not budget size.
- `combat_multiplier` is only modestly positive on mean, which makes sense for a sustain scenario that is not primarily about raw DPS.
- `hp_multiplier` is effectively flat in this specific harness right now, so it still looks real in pressure slices but under-expressed in longer sustain-only scoring.
- this closes the biggest remaining ambiguity from the broad Pearl scan: `hp_multiplier` and `auto_heal_behavior` are not missing runtime consumers, they are just poorly represented by the opening-window and general long-run reports

## Controller Diagnostics

From [tests/e2e/controller-balance-diagnostics.test.ts](../tests/e2e/controller-balance-diagnostics.test.ts):

This harness now uses fixed seeds per controller slice and actually deploys the
Pearl specialists in the micro-worlds that claim to measure them. The old
variant-per-seed setup was overstating some rows and the old attack micro slice
was incorrectly reporting a deleted Pearl combat specialist instead of the real fielded unit.

- Gather controller:
  - `gather_multiplier` now cleanly shows up as a higher `gatherSpeedMod`, but the fixed-seed short window is still travel-bound enough that raw gathered output stays flat in that slice
  - the new `fisher_radius` row is live and covered here, but it currently reads flat against `blueprint_fisher` in the short fixed-seed slice because the default fish lane is already fully covered
  - `blueprint_digger` and `blueprint_logger` do increase rock/log collection when the gather controller is forced to care about those tracks
  - `rare_resource_access` now adds rare nodes only in the bottom-row panels, which keeps the runtime consumer active without luring gatherers into the hostile top row
- Build controller:
  - the wing-placement bug is fixed: the build controller now reaches Armory around frame `360` in the baseline slice and around frame `240` in the stronger variants instead of stalling indefinitely
  - the construction-throughput pass is now also live: the controller completes `1` structure in that slice instead of stalling at `0`, which means the Armory is no longer just being placed and abandoned
  - the next build-side problem is later follow-up, not first completion: the micro slice still does not progress into a second static-defense structure inside the short window, but the full-governor trace now does open sampled proactive-build decisions on at least part of the stage-6 seed set (`build:1` in the healthier long-run rows instead of universal `build:0`)
- Train controller:
  - the prestige population fix removed a real false-negative path: `blueprint_fisher` no longer steals a training slot by consuming baseline food
  - short-window training throughput is still bottlenecked by queue timing and building cadence more than raw fish income
- Defend controller:
  - `auto_repair_behavior`, `hp_multiplier`, and `auto_heal_behavior` all improve raw Lodge survival in the defend-only slice, with `auto_heal_behavior` currently showing the largest kill-side bump there
  - the new `shaman_radius` row is also live and currently reads flat against `blueprint_shaman` in this short hold slice, which indicates the default defense pocket is already small enough to be covered without the radius upgrade
  - that means the strongly negative blended pressure scores are not purely missing runtime effects; they are interactions inside the full governor loop
- Attack controller:
  - the attack controller does convert better in the micro slice now, and that attack-specific diagnostic now uses the canonical `blueprint_guard` specialist instead of the obsolete Hunter path
  - the full-governor stage-6 trace is materially healthier after the governor train/arbitration fix: the sampled baseline now opens `1` committed attack window instead of `0`, so the remaining blocker is sustained safety and post-Armory defensive follow-up rather than total failure to convert readiness into pressure

## Interpretation

- Cheap first-rank Clam tracks still mostly land around **0.1% to 0.4% mean relief** in the stricter live-stack sampled stage-6 report, but the post-match Clam report now has one clear fortification outlier: `defense_wall_hp_t0` is no longer flat and currently leads the broad Clam scan at about **5.32%** mean meta relief once the governor preserves its first wall budget under pressure.
- The post-match Clam broad scan now agrees directionally with the sampled Clam rows: basic gather, node-yield, and clam-bonus T1 purchases are positive once they are measured as real between-match purchases instead of frame-zero injections.
- The remaining Clam broad-report gap is narrower now: the first real siege-runtime pass woke up `siege_damage`, `sapper_speed`, and `siege_range`, the utility speed/runtime pass pulled `utility_unit_speed` and `utility_train_speed` back off the negative line, the stage-6 support-arbitration pass made `utility_heal_power` express strongly in the post-match loop, the fog/runtime report pass pulled `utility_vision_range` off dead zero, the new lodge-repair savings guard made `defense_wall_hp_t0` a clearly positive row instead of a dead one, the tower-log preservation pass pulled `defense_tower_damage_t0` off flat zero, the movement-side gather-radius pass finally moved `economy_gather_radius_t0` into the weak-positive band at about `0.10%` mean relief, and the new two-Sapper demolish raid window pulled `siege_demolish_power_t0` off exact zero to about `0.18%` mean relief. The remaining weak Clam rows are now expression-quality issues rather than dead runtime paths.
- Early sampled Pearl tracks are mostly flat-to-positive now, and the long-run broad Pearl scan is mixed rather than broadly positive: frontline/support specialist-cap tracks lead, while Logger/Digger remain the strongest negative anomalies.
- Under forced early combat pressure, all four tested Pearl combat/repair tracks are now positive, with `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` showing the strongest gains.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are confirmed as positive again after the gather-override persistence fix and fresh-world training-queue reset.
- The Pearl broad scan is now trustworthy enough to use as one release-budget input, and the Clam scan is no longer directionally wrong now that it uses a post-match purchase loop and the full live defensive stack.
- The Frontier ladder is now a pacing problem, not a survival problem. All five steps survive at `100%`, but the step-to-step relief is still only near-neutral in the short-match lens.
- The targeted governor trace is cleaner and now materially better on stage 6. In the refreshed live-stack trace it averages about `2.3` ready combat units in the opening slice and about `3.15` over 2400 frames, still reaches `readyForAttackPct = 75%` in the long slice, now opens `1` committed attack window in the sampled baseline rows, and no longer flatlines the build axis across every long-run seed. The remaining weakness is sustained siege pressure and static-defense follow-up: base pressure is still active for roughly `50%` to `56%` of long-run samples with average threat count around `4` to `5`.
- The corrected full-stack viability run is materially healthier than the older harness implied: a fresh stage-6 no-upgrade run now stays alive through the 1800-frame baseline check with Lodge HP around `1354` and `5` kills.
- The new sustain harness closes the other side of that gap. `auto_heal_behavior` and `auto_repair_behavior` now have a dedicated post-army scenario where they express strongly, while `hp_multiplier` still needs a better bridge between pressure slices and sustain scoring.
- The rare-resource prestige path is no longer a map-generation trap. Its opening-window wobble now looks like ordinary governor valuation noise rather than a fundamentally harmful spawn pattern.
- The utility timing rows are also cleaner now: `utility_unit_speed` is positive again once the movement buff stays on combat bodies instead of Mudpaws, and `utility_train_speed` is no longer negative once the train-speed multiplier stops accelerating Mudpaw filler queues.
- `utility_heal_power` is no longer a dead row either: once the governor treats that track as a real stage-6 support cue under pressure, the broad Clam report lifts it into the clearly positive band instead of flat zero.
- The stage-6 Clam report is also now clearer about what remains behavioral versus missing wiring: once the post-match harness actually runs fog-of-war and scores explored territory, `utility_vision_range` moves off zero but only barely (`~0.01%` mean relief), so the remaining problem there is stage-6 scenario expression rather than dead runtime coverage.
- The suspicious long-run Pearl set is now clearer: Logger and Digger specialist-cap tracks are still materially negative in the broad scan, while Fisher is only near-neutral and the plain multiplier tracks are modestly positive.
- The controller split still makes the attack/stabilization path the next highest-signal controller problem, but the center of gravity has shifted. The train path is now materially cleaner after the stage-aware combat-queue fix and attack-window arbitration pass; build follow-up and siege relief now look like the bigger remaining bottleneck once the Armory step is complete.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Investigate why the full-governor stage-6 run stays under heavy siege pressure even when `readyForAttackPct` reaches `75%`, with special focus on tower/burrow follow-up after the Armory step.
2. Improve the weak Frontier edge steps, especially `Frontier Expansion I` and `IV`, which are still slightly negative in the short-match lens.
3. Improve the sampled and controller gather slices so `gather_multiplier`, `blueprint_fisher`, `blueprint_digger`, and `blueprint_logger` are measured in a window that is less dominated by travel time and panel mix.
4. Bridge the sustain harness back into the broader Pearl budgeting view for `hp_multiplier`, since it is locally real but still under-expressed in both the broad and sustain reports.
5. Add specialist-zone upgrade rows to the Pearl budgeting harness so `operating_radius`, `anchor_radius`, `engagement_radius`, and `projection_range` have measured relief bands instead of only unit/runtime coverage.
6. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
