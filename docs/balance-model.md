# Balance Model

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
- Pearl auto-deploy specialists are permanent helper units and should not consume the same food cap the baseline run uses for ordinary production.
- If a building or response is required to clear a pane, it belongs in baseline pane progression, not behind Clams.

## Current Model

Implemented in [progression-model.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/balance/progression-model.ts).

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

From [balance-track-shifts.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/balance-track-shifts.test.ts), stage 6, 1800 frames, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| clam_gather_t1 | -1.04 | 5.83 | 13.58 |
| clam_yield_t1 | 0.77 | 6.66 | 13.82 |
| clam_clam_bonus_t1 | 0.09 | 6.09 | 13.17 |
| pearl_clam_earnings_rank_1 | -1.66 | 1.68 | 6.18 |
| pearl_gather_rank_2 | -1.92 | 0.91 | 5.90 |
| pearl_auto_deploy_fisher | -1.92 | 1.27 | 5.69 |
| pearl_starting_tier_1 | -1.30 | 1.72 | 6.77 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The diagnostic also now includes the controller/runtime fixes for gather
override persistence, specialist governor lockout, prestige population
accounting, the combat counter-scaling fix, governor attack-party reuse, safer
governor attack pacing, and bottom-row-only rare resource placement. Before
those fixes, boosted gather tracks could falsely go deeply negative because
workers lost their assigned resource intent after depletion or flee recovery,
several Pearl specialists could be re-commanded by the governor instead of
staying on their intended fixed roles, auto-deploy Pearl tracks could look
worse than baseline simply because they consumed food that the baseline run
needed for normal training, combat tracks could be suppressed because melee and
projectile counters were effectively being applied twice at damage time, attack
parties could get stranded in old overrides instead of being recalled for base
defense, and rare-resource prestige nodes could spawn as gatherer bait in the
hostile top row.

## Exhaustive First-Rank Report

From [exhaustive-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-balance-report.test.ts), stage 6, 1200 frames, seeds `11/42/77`:

- The report now separates `power_mean_pct`, `economy_mean_pct`, and `meta_mean_pct`, plus `meta_min_pct` and `meta_max_pct`.
- Clam T1 tracks still cluster tightly on observed in-match power, which is a strong sign that many categories remain runtime-flat or measurement-flat in this window.
- Direct multiplier tracks now also carry a `budget_pct`, so we can explicitly compare configured stat budget against observed relief.
- If `budget_pct` is non-zero but both observed power and observed economy are near zero, that track is not being expressed strongly enough in live play or diagnostics.

Current corrected readout:

- Clam T1:
  - `economy_node_yield_t0` is currently strongest at about `4.79%` `meta_mean_pct`
  - the basic gather tracks are close behind at about `4.08%`
  - most non-economy Clam T1 rows still cluster tightly around `4.08%`, which means the harness can now see them as positive, but it still cannot distinguish many categories from each other in this window
  - `economy_mean_pct` is still `0` across the sampled Clam T1 set, so the current report is still mostly observing battlefield pacing, not post-match reward acceleration
- Pearl rank 1:
  - `auto_deploy_fisher` is now strongly positive at about `6.02%` `meta_mean_pct`
  - `auto_deploy_digger` and `auto_deploy_logger` crossed into positive territory at roughly `1.50%` `meta_mean_pct`, though their minimums are still unstable
  - `auto_deploy_hunter` improved to about `1.11%`, and `auto_deploy_guardian` improved to about `0.71%`
  - `auto_deploy_ranger`, `auto_deploy_shaman`, and `auto_deploy_lookout` still sit just below neutral at about `-0.51%`
  - `rare_resource_access` improved dramatically after moving rare nodes out of the hostile top row and now sits roughly at break-even (`-0.02%` `meta_mean_pct`)
  - `starting_tier` is still negative at about `-2.08%`, which means the current harness still does not value that tempo correctly enough
  - `combat_multiplier` improved materially but is still negative at about `-2.57%`
  - `clam_earnings_multiplier` remains economy-only with `4.22%` `economy_mean_pct`, but its combined `meta_mean_pct` is still negative in this stage-6 window because it does not improve in-match power
  - `auto_repair_behavior`, `gather_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are the main remaining negative cluster at roughly `-3.91%` to `-3.93%`

## Combat-Pressure Diagnostic

From [pearl-combat-pressure-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | 0.35 | 0.35 | 0.35 |
| hp_multiplier | 2.05 | 2.05 | 2.05 |
| auto_heal_behavior | 3.11 | 3.11 | 3.11 |
| auto_repair_behavior | 3.18 | 3.18 | 3.18 |

This is not a tuning success. It is a diagnostic finding:

- `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are now all clearly positive under pressure
- `auto_repair_behavior` remains positive and now edges out the direct damage track in this specific setup
- this still confirms the direct combat runtime and local defensive expression are working better than the blended stage-6 exhaustive report suggests, even though the gains are now more modest under the safer governor pacing
- the remaining negative blended full-run rows now point more strongly at governor pathing and long-window decision policy than at missing damage/heal consumers

## Controller Diagnostics

From [controller-balance-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/controller-balance-diagnostics.test.ts):

This harness now uses fixed seeds per controller slice and actually deploys the
Pearl specialists in the micro-worlds that claim to measure them. The old
variant-per-seed setup was overstating some rows and the old attack micro slice
was incorrectly reporting `auto_deploy_hunter` without spawning a hunter.

- Gather controller:
  - `gather_multiplier` now cleanly shows up as a higher `gatherSpeedMod`, but the fixed-seed short window is still travel-bound enough that raw gathered output stays flat in that slice
  - `auto_deploy_digger` and `auto_deploy_logger` do increase rock/log collection when the gather controller is forced to care about those tracks
  - `rare_resource_access` now adds rare nodes only in the bottom-row panels, which keeps the runtime consumer active without luring gatherers into the hostile top row
- Build controller:
  - the new controller slice exposed a real bug: wing-building placement offsets were too small, so the build controller could repeatedly fail to place Armory wings near the Lodge
  - after fixing [build-goal.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/governor/goals/build-goal.ts), the build controller now reaches Armory within a few controller cycles instead of stalling indefinitely
- Train controller:
  - the prestige population fix removed a real false-negative path: `auto_deploy_fisher` no longer steals a training slot by consuming baseline food
  - short-window training throughput is still bottlenecked by queue timing and building cadence more than raw fish income
- Defend controller:
  - `auto_repair_behavior`, `hp_multiplier`, and `auto_heal_behavior` all improve raw Lodge survival in the defend-only slice
  - that means the strongly negative blended pressure scores are not purely missing runtime effects; they are interactions inside the full governor loop
- Attack controller:
  - the attack controller now issues shared-target attack orders instead of splitting units across the line by default
  - the governor now waits for a safer attack army size in full play, avoids launching just before a wave, and avoids launching off a damaged Lodge
  - regular attack parties are now reassignable back into defense instead of getting stranded behind their old governor-issued attack overrides, while prestige-locked specialists stay on their fixed roles
  - it still converts that into only trivial or zero kills in the short skirmish slice, which makes the attack path a concrete remaining gap rather than a scoring artifact

## Interpretation

- Cheap first-rank Clam tracks are currently landing around **6% to 8% sampled mean relief** in the smaller report.
- Early sampled Pearl tracks are now directionally positive across the selected rows, but still much smaller than Clam T1 relief in the same window.
- Under forced early combat pressure, all four tested Pearl combat/repair tracks are now positive, with `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` showing the strongest gains.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are now confirmed as positive again after the gather-override persistence fix.
- The exhaustive report still shows a second issue beyond raw tuning: many Clam categories remain too tightly clustered, and several Pearl tracks are still either inert or actively harmful in governor play.
- Some of the remaining Pearl negatives are now much more clearly governor-quality problems rather than missing runtime consumers: the direct combat-pressure harness flipped positive after the damage-path fix, while the long stage-6 governor harness still undervalues the same upgrades.
- The rare-resource prestige path is no longer a map-generation trap. Its near-neutral stage-6 score now points at ordinary governor valuation limits rather than a fundamentally harmful spawn pattern.
- The controller split still makes the attack path the next highest-signal controller problem. The train path is cleaner after the prestige population fix, but attack still fails to cash in its orders over the longer governor run.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Investigate the remaining attack-controller conversion gap, since the governor now shares targets, reuses attack parties, and paces attacks more safely, but still does not convert that into enough long-run kill value in the exhaustive harness.
2. Reconcile the remaining blended full-run negatives for `combat_multiplier`, `hp_multiplier`, `auto_heal_behavior`, and `auto_repair_behavior` against the now-positive pressure harness, since that mismatch still points at governor-path or pacing issues rather than missing combat consumers.
3. Improve the sampled and controller gather slices so `gather_multiplier` is measured in a window that is less dominated by travel time.
4. Expand the diagnostics from sampled tracks to every Clam subcategory and every Pearl upgrade.
5. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
6. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
