# promote a release (blue/green)

the api, projector and mentor run as two deployments each, `blue` and
`green`; the service selects one by its `color` label. a release goes to the
idle color, the golden-verdict suite runs against it, and only then does the
selector flip. judge workers are not blue/green: they are stateless consumers
and roll via the normal deployment rollout, with `SANDBOX_IMAGE_TAG` pinned.

```bash
infra/k8s/promote.sh api v1.4.0      # builds nothing; expects the image to exist
```

what the script does, so you can do it by hand when it cannot:
1. reads the live color from the service selector; the target is the other one.
2. sets the target deployment's image to the new tag and waits for rollout.
3. runs the golden suite with `SANDBOX_IMAGE_TAG` set to the tag the new workers will use. **one mismatch stops here.**
4. patches the service selector to the target color. traffic moves in one step.
5. leaves the old color running at its last image for a fast rollback: `kubectl patch svc api -p '{"spec":{"selector":{"color":"<old>"}}}'`.

rollback is the same patch in reverse and takes seconds. the only thing that
cannot be rolled back this way is a mongo index migration; those are additive
only (lld §2) for exactly this reason.
