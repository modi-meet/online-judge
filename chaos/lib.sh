# shared helpers for the chaos drills. source, do not run.
# needs: curl, python3, a running api (BASE) and the seed data.
BASE="${BASE:-http://localhost:4000}"
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
login() { curl -sf -X POST "$BASE/api/auth/login" -H 'content-type: application/json' -d "{\"username\":\"$1\",\"password\":\"$2\"}" | json "['accessToken']"; }
register() { curl -s -X POST "$BASE/api/auth/register" -H 'content-type: application/json' -d "{\"username\":\"$1\",\"email\":\"$1@chaos.test\",\"password\":\"chaos-pass-123\"}" | json "['accessToken']"; }
problem_id() { curl -sf "$BASE/api/problems?limit=50" | json "['items']" >/dev/null; curl -sf "$BASE/api/problems?limit=50" | python3 -c "import sys,json; print(next(p['id'] for p in json.load(sys.stdin)['items'] if p['slug']=='$1'))"; }
submit() { # token problemId code [contestId]
  local body; body=$(python3 -c "import json,sys; print(json.dumps({'problemId':sys.argv[1],'language':'python3','code':sys.argv[2],**({'contestId':sys.argv[3]} if len(sys.argv)>3 and sys.argv[3] else {})}))" "$2" "$3" "${4:-}")
  curl -sf -X POST "$BASE/api/submissions" -H 'content-type: application/json' -H "authorization: Bearer $1" -d "$body" | json "['submissionId']"
}
status() { curl -sf "$BASE/api/submissions/$2" -H "authorization: Bearer $1" | json "['submission']['status']"; }
wait_terminal() { # token id timeoutSec
  local t=0; while [ $t -lt "$3" ]; do s=$(status "$1" "$2"); case "$s" in QUEUED|RUNNING) sleep 1; t=$((t+1));; *) echo "$s"; return 0;; esac; done; echo "STUCK"; return 1
}
pass() { printf '\033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '\033[31mFAIL\033[0m %s\n' "$1"; exit 1; }
