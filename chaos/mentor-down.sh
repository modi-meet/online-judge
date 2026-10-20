#!/usr/bin/env bash
# drill 3 (hld §14, lld §8.8): the intelligence plane goes away mid-contest.
# judging and standings must not notice. point MENTOR at the mentor you are
# about to stop; this script only observes it.
#   bash chaos/mentor-down.sh    (stop the ai-mentor process first)
set -euo pipefail
cd "$(dirname "$0")/.."
source chaos/lib.sh
MENTOR="${MENTOR:-http://localhost:4002}"

if curl -sf "$MENTOR/api/ai/health" >/dev/null; then fail "the mentor is still up at $MENTOR — stop it, then rerun"; fi
pass "mentor is down"
curl -sf "$BASE/health" >/dev/null && pass "api is up" || fail "api is down too — that is the bug"
TOK=$(register "chaos_$(date +%s)")
PID=$(problem_id sum-of-two)
CID=$(curl -sf "$BASE/api/contests" | python3 -c "import sys,json; c=[c for c in json.load(sys.stdin)['items'] if c['phase']=='running']; print(c[0]['id'] if c else '')")
[ -n "$CID" ] && curl -sf -X POST "$BASE/api/contests/$CID/register" -H "authorization: Bearer $TOK" >/dev/null || true
ID=$(submit "$TOK" "$PID" 'a, b = map(int, input().split())
print(a + b)
' "$CID")
V=$(wait_terminal "$TOK" "$ID" 60)
[ "$V" = "AC" ] && pass "judged without the mentor: $V" || fail "verdict $V"
if [ -n "$CID" ]; then
  R=$(curl -sf "$BASE/api/contests/$CID/leaderboard?limit=100" -H "authorization: Bearer $TOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('me') or {}).get('rank') or next((r['rank'] for r in d['items'] if r['solved']>0), ''))")
  [ -n "$R" ] && pass "standings updated (rank $R)" || fail "standings did not update"
fi
