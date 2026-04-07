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
| clam_gather_t1 | -1.35 | 3.69 | 13.43 |
| clam_yield_t1 | -0.98 | 4.15 | 13.77 |
| clam_clam_bonus_t1 | -1.35 | 3.58 | 13.11 |
| pearl_clam_earnings_rank_1 | -1.71 | 1.29 | 6.12 |
| pearl_gather_rank_2 | -2.03 | 0.88 | 5.91 |
| pearl_auto_deploy_fisher | -2.03 | 0.86 | 5.63 |
| pearl_starting_tier_1 | -1.66 | 1.60 | 6.77 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The diagnostic also now includes the controller/runtime fixes for gather
override persistence. Before that fix, boosted gather tracks could falsely go
deeply negative because workers lost their assigned resource intent after
depletion or flee recovery.

## Exhaustive First-Rank Report

From [exhaustive-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-balance-report.test.ts), stage 6, 1200 frames, seeds `11/42/77`:

- The report now separates `power_mean_pct`, `economy_mean_pct`, and `meta_mean_pct`, plus `meta_min_pct` and `meta_max_pct`.
- Clam T1 tracks still cluster tightly on observed in-match power, which is a strong sign that many categories remain runtime-flat or measurement-flat in this window.
- Direct multiplier tracks now also carry a `budget_pct`, so we can explicitly compare configured stat budget against observed relief.
- If `budget_pct` is non-zero but both observed power and observed economy are near zero, that track is not being expressed strongly enough in live play or diagnostics.

Current corrected readout:

- Clam T1:
  - `economy_node_yield_t0` is currently strongest at about `5.20%` `meta_mean_pct`
  - basic gather tracks land around `4.78%` `meta_mean_pct`
  - most non-economy Clam T1 rows still cluster tightly around `4.54%`, which means the harness can now see them as positive, but it still cannot distinguish many categories from each other in this window
  - `economy_mean_pct` is still `0` across the sampled Clam T1 set, so the current report is still mostly observing battlefield pacing, not post-match reward acceleration
- Pearl rank 1:
  - worker auto-deploys are now clearly positive: `auto_deploy_fisher`, `auto_deploy_digger`, and `auto_deploy_logger` are all around `2.13%` `meta_mean_pct`
  - `clam_earnings_multiplier` remains economy-only with `3.22%` `economy_mean_pct`, but its combined `meta_mean_pct` is still negative in this stage-6 window because it does not improve in-match power
  - `combat_multiplier`, `hp_multiplier`, `auto_heal_behavior`, and `gather_multiplier` are still negative in the stage-6 exhaustive report
  - `rare_resource_access` is still strongly negative in this governor scenario, which likely means the governor is not exploiting the extra node mix effectively

## Combat-Pressure Diagnostic

From [pearl-combat-pressure-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | 0.43 | 0.43 | 0.43 |
| hp_multiplier | -13.66 | -13.66 | -13.66 |
| auto_heal_behavior | -13.73 | -13.73 | -13.73 |
| auto_repair_behavior | 3.22 | 3.22 | 3.22 |

This is not a tuning success. It is a diagnostic finding:

- `combat_multiplier` is now barely positive and `auto_repair_behavior` is meaningfully positive in the immediate-pressure scenario
- `hp_multiplier` and `auto_heal_behavior` are still materially negative under the same pressure setup
- this narrows the investigation: the blanket "all Pearl combat tracks are broken" diagnosis is no longer true, but the HP/heal expression path is still not helping the governor survive early pressure

## Interpretation

- Cheap first-rank Clam tracks are currently landing around **3.6% to 4.2% sampled mean relief** in the smaller report.
- Early Pearl tracks are much smaller, roughly **0.8% to 1.6% sampled mean relief** in the sampled report, with several still negative in the exhaustive stage-6 report.
- Under forced early combat pressure, `hp_multiplier` and `auto_heal_behavior` are still negative on average, while `combat_multiplier` and `auto_repair_behavior` are now at least directionally positive.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are now confirmed as positive again after the gather-override persistence fix.
- The exhaustive report still shows a second issue beyond raw tuning: many Clam categories remain too tightly clustered, and several Pearl tracks are still either inert or actively harmful in governor play.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Investigate the still-negative Pearl tracks, especially `hp_multiplier`, `auto_heal_behavior`, `rare_resource_access`, and the non-worker auto-deploy set.
2. Expand the diagnostics from sampled tracks to every Clam subcategory and every Pearl upgrade.
3. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
4. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
