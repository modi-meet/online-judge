# chaos drills

the three failures hld §14 says the system must survive, as scripts you run
against a local stack. each one prints PASS or FAIL and exits accordingly.

| drill | what breaks | what must hold |
|---|---|---|
| `kill-worker.sh` | `kill -9` a judge worker mid-judge | the verdict still lands (bullmq redelivery, sweeper backstop) |
| `redis-flush.sh` | `flushall` on redis during a running contest | standings rebuild identically from the submissions log |
| `mentor-down.sh` | the ai mentor is stopped | judging and standings are unaffected; only the mentor panel reports itself down |

run them one at a time with the stack up (`pnpm stack:up`, api, worker) and
the seed loaded. `kill-worker.sh` starts its own worker, so stop the dev one
first or they will race for the job.
