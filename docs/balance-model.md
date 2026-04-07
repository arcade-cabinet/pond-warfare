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
| clam_gather_t1 | -1.62 | 4.75 | 11.14 |
| clam_yield_t1 | -0.94 | 5.33 | 11.79 |
| clam_clam_bonus_t1 | -1.62 | 4.77 | 11.19 |
| pearl_clam_earnings_rank_1 | -0.98 | 3.25 | 10.44 |
| pearl_gather_rank_2 | 0.46 | 4.55 | 8.48 |
| pearl_auto_deploy_fisher | -1.24 | 2.97 | 10.16 |
| pearl_starting_tier_1 | 1.09 | 5.37 | 9.37 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The diagnostic also now includes the controller/runtime fixes for gather
override persistence and specialist governor lockout. Before those fixes,
boosted gather tracks could falsely go deeply negative because workers lost
their assigned resource intent after depletion or flee recovery, and several
Pearl specialists could be re-commanded by the governor instead of staying on
their intended fixed roles.

## Exhaustive First-Rank Report

From [exhaustive-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-balance-report.test.ts), stage 6, 1200 frames, seeds `11/42/77`:

- The report now separates `power_mean_pct`, `economy_mean_pct`, and `meta_mean_pct`, plus `meta_min_pct` and `meta_max_pct`.
- Clam T1 tracks still cluster tightly on observed in-match power, which is a strong sign that many categories remain runtime-flat or measurement-flat in this window.
- Direct multiplier tracks now also carry a `budget_pct`, so we can explicitly compare configured stat budget against observed relief.
- If `budget_pct` is non-zero but both observed power and observed economy are near zero, that track is not being expressed strongly enough in live play or diagnostics.

Current corrected readout:

- Clam T1:
  - `economy_node_yield_t0` is currently strongest at about `6.21%` `meta_mean_pct`
  - basic gather tracks land around `5.49%` `meta_mean_pct`
  - most non-economy Clam T1 rows still cluster tightly around `5.49%`, which means the harness can now see them as positive, but it still cannot distinguish many categories from each other in this window
  - `economy_mean_pct` is still `0` across the sampled Clam T1 set, so the current report is still mostly observing battlefield pacing, not post-match reward acceleration
- Pearl rank 1:
  - `auto_deploy_fisher` remains slightly positive at about `0.78%` `meta_mean_pct`
  - `auto_deploy_hunter` improved materially after the specialist lockout fix and now sits near neutral at about `-1.10%` `meta_mean_pct` with a positive `economy_mean_pct`
  - `auto_deploy_digger` and `auto_deploy_logger` are still negative in the blended stage-6 report, which strongly suggests the current harness still undervalues non-fish gathering in that scenario
  - `clam_earnings_multiplier` remains economy-only with `3.22%` `economy_mean_pct`, but its combined `meta_mean_pct` is still negative in this stage-6 window because it does not improve in-match power
  - `combat_multiplier`, `hp_multiplier`, `auto_heal_behavior`, and `gather_multiplier` are still negative in the stage-6 exhaustive report
  - `rare_resource_access` improved substantially after the governor/runtime fixes, but is still negative in this governor scenario, which likely means the governor is still not exploiting the extra node mix effectively enough

## Combat-Pressure Diagnostic

From [pearl-combat-pressure-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | -13.27 | -13.27 | -13.27 |
| hp_multiplier | -12.04 | -12.04 | -12.04 |
| auto_heal_behavior | -11.85 | -11.85 | -11.85 |
| auto_repair_behavior | 2.78 | 2.78 | 2.78 |

This is not a tuning success. It is a diagnostic finding:

- `auto_repair_behavior` is still meaningfully positive in the immediate-pressure scenario
- `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are all still materially negative under the same pressure setup
- this keeps the investigation focused on defensive expression under pressure rather than on pure economy or progression wiring

## Controller Diagnostics

From [controller-balance-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/controller-balance-diagnostics.test.ts):

- Gather controller:
  - `gather_multiplier` massively increases gather-loop output in isolation
  - `auto_deploy_digger` and `auto_deploy_logger` do increase rock/log collection when the gather controller is forced to care about those tracks
  - `rare_resource_access` increases rock intake in the gather-only slice, which confirms the runtime consumer exists even though the blended governor score still undervalues it
- Build controller:
  - the new controller slice exposed a real bug: wing-building placement offsets were too small, so the build controller could repeatedly fail to place Armory wings near the Lodge
  - after fixing [build-goal.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/governor/goals/build-goal.ts), the build controller now reaches Armory within a few controller cycles instead of stalling indefinitely
- Train controller:
  - short-window training throughput is still bottlenecked by food/queue behavior more than raw fish income
  - `auto_deploy_fisher` can explode fish stockpile in the isolated slice without turning that into more trained units over the same window
- Defend controller:
  - `auto_repair_behavior`, `hp_multiplier`, and `auto_heal_behavior` all improve raw Lodge survival in the defend-only slice
  - that means the strongly negative blended pressure scores are not purely missing runtime effects; they are interactions inside the full governor loop
- Attack controller:
  - the attack controller now clearly issues orders and commits at least `4` units
  - it still converts that into only trivial or zero kills in the short skirmish slice, which makes the attack path a concrete remaining gap rather than a scoring artifact

## Interpretation

- Cheap first-rank Clam tracks are currently landing around **4.7% to 5.3% sampled mean relief** in the smaller report.
- Early Pearl tracks are much larger in the sampled report now, roughly **3.0% to 5.4% sampled mean relief** for the selected rows, but several are still negative in the exhaustive stage-6 report.
- Under forced early combat pressure, only `auto_repair_behavior` is directionally positive; `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are still negative on average.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are now confirmed as positive again after the gather-override persistence fix.
- The exhaustive report still shows a second issue beyond raw tuning: many Clam categories remain too tightly clustered, and several Pearl tracks are still either inert or actively harmful in governor play.
- Some of the remaining Pearl negatives are now clearly diagnostic-quality problems rather than missing runtime consumers: the blended governor harness still overweights fish-economy pressure and under-reads non-fish gathering plus specialist role value.
- The controller split makes the attack and train paths the next highest-signal controller problems: build and gather now express their upgrades, but attack still fails to cash in its orders and train still fails to turn extra economy into faster army growth.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Investigate the attack controller path, since it now clearly issues attack orders but still produces `0` kills in the isolated skirmish slice.
2. Investigate the train controller throughput bottleneck, since extra economy is not reliably converting into faster unit output.
3. Reconcile the blended negative pressure scores for `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` against the controller-only defend slice that shows those effects do help raw Lodge survival.
4. Expand the diagnostics from sampled tracks to every Clam subcategory and every Pearl upgrade.
5. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
6. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
