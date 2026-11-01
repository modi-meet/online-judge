# demo seed

A job that fills a local judge with a believable community, for demos and UI work.

- `bank/`: 100 original problems. Each has a generator, a Python reference and an independent C++ reference. `build.py --check N` runs both on every test and fails on any disagreement. Tests are generated, never committed.
- `src/people.ts`: 22 people with a hidden skill, a main language, a time zone and a practice habit.
- `src/main.ts`: practice history from each person's join date, seven past contests everyone took part in, ICPC standings through the judge's own scoring and Redis projection, and Elo ratings from the results.

```bash
pnpm demo:seed
```

It is idempotent: a re-run removes its own users, their submissions and its contests first. Every demo account uses the password in `src/people.ts`. This is local test data only.
