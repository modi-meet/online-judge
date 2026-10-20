# load tests

two generators for the same question: does `/submit` stay under 200 ms while
the judge fleet drains verdicts within budget?

| script | needs | what it is |
|---|---|---|
| `burst.mjs` | node 22, a running stack | a burst of n submissions at a fixed concurrency; prints submit and verdict percentiles and saves them under `results/` |
| `k6/contest.js` | [k6](https://k6.io) | the hld §14 contest profile: vus register, submit eight times each, 30% of them concentrated in the last tenth of the window; thresholds encode the pass condition |

```bash
node load/seed-users.mjs --users 200      # once: user rows + 4 h tokens in load/.tokens.json
node load/burst.mjs --users 20 --subs 100 --conc 20
k6 run -e VUS=2000 -e SUBS=8 -e WINDOW_MIN=60 load/k6/contest.js
```

the generator does not register users through the api: the login bucket is
per ip (five a minute), which is exactly what should happen to one address
creating thousands of accounts. `seed-users.mjs` writes the rows and mints
tokens with the shared secret instead, so it runs inside the trust boundary.

the point of the run is the capacity table in hld §7: judge duration, container
overhead and slots per node are estimates until this replaces them with
measurements. results from a laptop are a sanity check, not the number.
