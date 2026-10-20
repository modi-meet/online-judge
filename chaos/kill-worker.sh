#!/usr/bin/env bash
# drill 1 (hld §14): kill -9 a judge worker mid-judge. the verdict must still
# land — bullmq redelivers the job after the lock expires (90 s), and the
# sweeper is the backstop. runs its own worker so it can kill it without
# touching yours; stop the dev worker first or two will race for the job.
#   bash chaos/kill-worker.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source chaos/lib.sh
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"

echo "building the worker…"; pnpm --filter @oj/judge-worker build >/dev/null
LOG=$(mktemp -t oj-chaos); echo "worker logs: $LOG"
# exec so the pid is node itself, and a log file so the workers never hold our stdout open
echo "starting worker A"; (cd apps/judge-worker && exec env JUDGE_SLOTS=1 METRICS_PORT=9111 LOG_LEVEL=info node dist/main.js >>"$LOG" 2>&1) & A=$!
sleep 3
TOK=$(register "chaos_$(date +%s)")
PID=$(problem_id sum-of-two)
# a solution that sleeps 1.5 s per case: wall time, not cpu, so it stays
# inside the 1 s cpu limit and the 3 s wall cap while giving a ~5 s window
SLOW='import time
a, b = map(int, input().split())
time.sleep(1.5)
print(a + b)
'
ID=$(submit "$TOK" "$PID" "$SLOW")
echo "submitted $ID"
sleep 3
echo "kill -9 worker A ($A) mid-judge"; kill -9 $A; wait $A 2>/dev/null || true
echo "status after the kill: $(status "$TOK" "$ID")"
echo "starting worker B"; (cd apps/judge-worker && exec env JUDGE_SLOTS=1 METRICS_PORT=9112 LOG_LEVEL=info node dist/main.js >>"$LOG" 2>&1) & B=$!
trap 'kill $B 2>/dev/null || true' EXIT
echo "waiting for redelivery (lock ttl 90 s)…"
V=$(wait_terminal "$TOK" "$ID" 180)
[ "$V" = "AC" ] && pass "verdict landed after the kill: $V" || fail "verdict was $V"
