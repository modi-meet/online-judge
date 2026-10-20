# mentor budget exhausted

**symptom.** the mentor panel says "out of tokens for today"; `ai_tokens_total{direction="out"}` has stopped growing; nothing else is affected.

**this is the system working.** `AI_DAILY_TOKEN_CAP` is the daily output-token spend across every user; each user gets a tenth. the budget is the one thing standing between a public endpoint and an llm bill, so it is enforced before the provider is called and the cap is deliberately low until there is usage data.

**check.**
1. `redis-cli get ai:tokens:$(date -u +%F)` against the cap. a single user at a tenth of it: `redis-cli --scan --pattern "ai:tokens:$(date -u +%F):*"`.
2. `leak_guard_triggered_total` — a high rate means the model is trying to hand out solutions and each blocked reply still cost tokens. tighten the prompt before raising the cap.
3. the cache hit ratio: `ai:cache:*` key count vs requests. identical questions are free; a low ratio with high spend usually means a contest where everyone edits code between asks (expected).

**do.**
- raise `AI_DAILY_TOKEN_CAP` on the mentor deployment and restart it. the key is per utc day, so the new cap applies immediately.
- one user burning the share: that is what the per-user tenth is for; it resets at midnight utc. nothing to do.
- a runaway provider bill with the cap intact: check `ai_tokens_total` by `mode`. modes 3 and 4 carry a trace or timing table in the prompt; input is cached but output is not. lower `maxOutputTokens` in the mode registry.
- switching the mentor off entirely: `AI_ENABLED=false` and restart. the api does not care; the panel reports itself unavailable.
