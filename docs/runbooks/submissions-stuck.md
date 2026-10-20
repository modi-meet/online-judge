# submissions stuck in QUEUED or RUNNING

**symptom.** users see a pending chip for minutes; `submission_queue_depth` is flat; the sweeper log says `requeued` or `failed` every minute.

**why it happens.** a worker died mid-judge (oom, spot reclaim, `kill -9`). the row is RUNNING with its `judgedBy`, the bullmq job lock expires after 90 s and another worker picks it up. the sweeper (every 60 s) requeues anything pending for over five minutes up to three attempts, then marks it IE.

**check.**
1. `db.submissions.find({status:{$in:['QUEUED','RUNNING']}, submittedAt:{$lt: new Date(Date.now()-300000)}}).count()`.
2. the worker named in `judgedBy` — is it alive? if it is alive and the row is still RUNNING, the judge loop is hung on docker: check `docker ps` on that node for a container older than the wall limit.
3. redis reachable from the workers? a worker that cannot renew its lock looks exactly like a dead one.

**do.**
- a dead worker: nothing. redelivery and the sweeper handle it. verify with `chaos/kill-worker.sh` if you doubt it.
- a hung container: `docker kill` it; the executor's `finally` removes it and the run resolves as RE. the verdict is then the next case's.
- more than three attempts: the row is IE. look at the code (`codeRef`), reproduce in the sandbox, fix the executor, then re-enqueue it from a script with the `rejudge` priority (there is no rejudge endpoint yet; it is on the v4 list).
