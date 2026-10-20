# online judge — agent context

read this before touching anything. it is the compressed version of `docs/`.

## what this is

a sandboxed, queue-backed online judge (c++/python/java first) with an ai mentor whose answers come from real execution. three planes: **control** (api, mongo, redis, queue), **execution** (docker judge workers — the only place untrusted code runs), **intelligence** (ai mentor, ingestor). the api never compiles or executes code. the judge must keep working with the intelligence plane deleted.

## source of truth

- `docs/hld.html` — architecture, capacity model, security posture, decisions (hand-authored html)
- `docs/LLD.md` — schemas, signatures, algorithms, comparator edge cases, failure modes (markdown; `docs/lld.html` is generated from it)
- where they disagree, the lld wins
- regenerate html/pdf: `./docs/build-pdf.sh all` (needs chrome; `md2doc.py` renders markdown into the shared design system)

## non-negotiables from the design

- `/submit` only enqueues and returns 202 in < 200 ms; a worker judges
- verdict writes are compare-and-set against pending states, in the same mongo transaction as the outbox row (lld §7.6)
- test cases run sequentially per submission, one pinned core, tle decided on cgroup cpu time — never wall clock
- no `docker run --rm` for judging: create → start → read cgroup → rm (lld §17.1)
- the v0 host executor is dev-only and guarded four ways (lld §6.6); delete it when v1 merges
- the mentor never gets a hidden test case, never gets imported by api/worker, holds a read-only db credential
- kafka is not added until a second real consumer of judged events exists (hld §12)
- the golden-verdict suite (`packages/judge/test/golden`) is the promotion gate; a new verdict path means a new fixture
- load generators never register users through the api (the login bucket is per ip); `load/seed-users.mjs` mints the token pool

## where things are (v4)

- `apps/ai-mentor` — the intelligence plane, `:4002`. verifies the api's jwt with the shared secret; `MONGO_URI_RO` in prod. fake provider when `AI_API_KEY` is empty
- `packages/mentor` — pure parts of the mentor (modes, fitter, leak guard) with unit tests; no io
- `chaos/` — three drills, each prints PASS/FAIL. `kill-worker.sh` starts its own worker, stop the dev one first
- `load/` — `burst.mjs` (no deps) and `k6/contest.js`; results go to `docs/load-results.md`
- `docs/runbooks/` — one page per alert; `promote.md` is the blue/green flip (`infra/k8s/promote.sh`)
- `.github/workflows/ci.yml` — unit job, plus the golden suite on linux (tle/mle are indicative on macos, lld §17.2)

## build order

`contracts` → `db` → `sandbox` → comparators → `api` → `queue` + `judge-worker` → outbox → `events` + projector → sse/ws → mentor modes 1,2,5,6 → modes 3,4 → ingestor. lld §18 has the done-criteria per row. sandbox and comparators ship with their tests before the worker exists.

## repo conventions

- pnpm workspaces, node 22 (`nvm use` — the shell default is an x86 node 14 that breaks npm)
- `apps/*` are deployable processes, `packages/*` are libraries; a package never imports an app; `contracts` imports nothing
- every service validates its env with zod at boot and exits non-zero on a missing variable
- typescript everywhere; shared types come from `packages/contracts`, never redeclared

## git conventions

- `main` is the integration branch. every component or big task gets a branch off latest main and is merged back when done
- commits: lowercase, small, human-sounding. body uses bullet points when a commit does several things. no attribution trailers
- identity: meet modi <meetmodi8080@gmail.com>, pushed over ssh alias `github-personal` (account modi-meet). never the work account
- history is backdated to a code timeline: first commit 2026-09-06, each next commit 1–8 days later, until it reaches the real date, then dates go normal. set `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` (+05:30). the current cursor is the date of the latest commit on main — continue from there

## local stack

`pnpm stack:up` starts mongo, redis and minio from `infra/docker-compose.yml`. app processes run on the host. copy `.env.example` to `.env`.
