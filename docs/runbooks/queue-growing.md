# queue depth growing

**symptom.** `submission_queue_depth` rises for more than two minutes; `judge_duration_seconds` p95 may or may not move.

**check, in order.**
1. are workers alive? `kubectl get pods -l app=judge-worker` (or the worker log locally). `judge_slots_busy` at zero with depth growing means no worker is consuming.
2. is keda scaling? `kubectl get scaledobject judge-worker` — `READY True`, and the hpa should show replicas climbing toward `maxReplicaCount`. if it is pinned at max, the fleet is undersized for this peak.
3. is one language slow? `judge_duration_seconds` by `language`. a jump in one language usually means a runner image change (a bigger jvm, a debug build).
4. is docker healthy on the nodes? `docker ps` count per node near the pids limit, or `docker system df` full, means container creation is stalling. the executor's create → start → rm cycle leaks nothing by design, but a crashed worker can leave containers behind: `docker ps -a --filter status=exited | wc -l`.

**do.**
- short peak: raise `maxReplicaCount` on the scaledobject; keda does the rest.
- a node full of exited containers: `docker container prune -f` on that node, then restart the worker pod.
- a bad runner image: roll `SANDBOX_IMAGE_TAG` back to the previous tag in the worker deployment. the api does not need to restart.
- nothing above applies and depth keeps climbing: contest submissions are prioritised (`PRIORITY.contest`), so practice traffic absorbs the delay first. say so on the status page and let it drain. never judge on the api host.
