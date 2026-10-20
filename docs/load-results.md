# load test results

the hld §7 capacity model is a set of assumptions. this file is where they get
replaced by measurements, one run at a time. a laptop run is not the number
the fleet is sized from; it is the first data point and the shape of the
report every later run follows.

## run 1 — laptop burst, 2026-10-20

`node load/burst.mjs --users 20 --subs 80 --conc 16` against the dev stack
(api, one judge worker with two slots, colima docker, mongo and redis in
compose). problem `sum-of-two`, python, three test cases.

| metric | measured | budget |
|---|---|---|
| `/submit` p50 / p95 / p99 | 14 / 40 / 41 ms | p95 < 200 ms |
| verdict latency p50 / p95 | 7.6 / 7.9 s | p95 < 30 s |
| dropped submissions | 0 of 80 | 0 |
| judge throughput | 2.08 verdicts/s on 2 slots | — |
| judge duration (worker log) | 0.9–1.07 s per submission | §7 assumed 4 s |

verdict latency is queueing: 80 submissions arrived in under a second and two
slots drained them at ~1 s each, so the last one waited ~38 s... except it did
not — p95 was 7.9 s because the generator's concurrency of 16 throttled
arrivals to the drain rate. the k6 profile removes that coupling.

### what this changes in §7

| assumption | §7 value | measured here | note |
|---|---|---|---|
| median judge duration | 4 s | ~1 s (python, 3 cases, ~0.3 s container overhead per case) | §7 assumes 20 cases; at 0.3 s overhead per case that is ~6 s for python, so §7's 4 s is optimistic for interpreted languages and pessimistic for c++ |
| container start overhead | 400 ms | ~300 ms create → start → rm on colima | linux with a warm image should be under 200 ms; remeasure on the target instance type |
| `/submit` latency | < 200 ms | 40 ms p95 at 16 concurrent | the handler only enqueues; the number is mongo insert + redis xadd |

### what a laptop cannot tell you

- tle and mle are decided from gnu `time` inside the container, not the
  cgroup (lld §17.2). timing variance under load is a linux-ci measurement.
- one worker on one machine says nothing about slots per node. the §7 "cores − 2"
  rule needs a node pinned per slot and the timing-variance check from the hld.
- the generator and the judge shared the cpu. verdict latency here is a floor
  for the pipeline, not a ceiling for the fleet.

## how to add a run

run the generator, paste the json it saves under `load/results/`, fill the
two tables, and move any §7 row whose measurement disagrees with the estimate.
