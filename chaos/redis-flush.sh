#!/usr/bin/env bash
# drill 2 (hld §14): lose redis mid-contest. standings are a projection; after
# a flush they must come back identical from the submissions log via
# POST /contests/:id/rebuild (the kafka replay in the hld, mongo replay here
# while kafka stays gated).
#   bash chaos/redis-flush.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source chaos/lib.sh
REDIS_CLI="${REDIS_CLI:-docker exec $(docker ps --filter name=redis --format '{{.Names}}' | head -1) redis-cli}"

SETTER=$(login setter setter-password)
CID=$(curl -sf "$BASE/api/contests" | python3 -c "import sys,json; c=[c for c in json.load(sys.stdin)['items'] if c['phase']=='running']; print(c[0]['id'])")
board() { curl -sf "$BASE/api/contests/$CID/leaderboard?limit=100" -H "authorization: Bearer $SETTER" | python3 -c "import sys,json; print(json.dumps([(r['username'],r['solved'],r['penalty']) for r in json.load(sys.stdin)['items']]))"; }
BEFORE=$(board)
echo "standings before: $BEFORE"
echo "flushing redis…"; $REDIS_CLI flushall >/dev/null
AFTER_FLUSH=$(board)
echo "standings after flush: $AFTER_FLUSH"
curl -sf -X POST "$BASE/api/contests/$CID/rebuild" -H "authorization: Bearer $SETTER" >/dev/null
AFTER=$(board)
echo "standings after rebuild: $AFTER"
[ "$BEFORE" = "$AFTER" ] && pass "standings rebuilt identically" || fail "standings differ after rebuild"
