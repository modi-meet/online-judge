# runbooks

one page per alert. each says what the symptom looks like, what to check
in order, and what to do. written for the person on call at 2 am, so no
background reading is assumed.

- [queue depth growing](queue-growing.md) — `submission_queue_depth` climbing, verdict p95 over budget
- [submissions stuck](submissions-stuck.md) — rows sitting in QUEUED or RUNNING past five minutes
- [redis lost](redis-lost.md) — standings empty, rate limits open, sse silent
- [mentor budget exhausted](mentor-budget.md) — mentor panel says it is out of tokens
- [promote a release](promote.md) — the blue/green switch with the golden suite as the gate
