#!/usr/bin/env bash
# blue/green promotion with the golden-verdict suite as the gate (hld §13).
#   infra/k8s/promote.sh <service> <image-tag>
set -euo pipefail
SVC="$1"; TAG="$2"
cd "$(dirname "$0")/../.."
LIVE=$(kubectl get svc "$SVC" -o jsonpath='{.spec.selector.color}')
TARGET=$([ "$LIVE" = blue ] && echo green || echo blue)
echo "live=$LIVE target=$TARGET tag=$TAG"
kubectl set image "deployment/$SVC-$TARGET" "$SVC=ghcr.io/modi-meet/oj-$SVC:$TAG"
kubectl rollout status "deployment/$SVC-$TARGET" --timeout=5m
echo "golden-verdict suite against runner tag $TAG…"
SANDBOX_IMAGE_TAG="$TAG" pnpm --filter @oj/judge exec vitest run test/golden.test.ts || { echo "golden suite failed — $TARGET stays idle, $LIVE keeps serving"; exit 1; }
kubectl patch svc "$SVC" -p "{\"spec\":{\"selector\":{\"app\":\"$SVC\",\"color\":\"$TARGET\"}}}"
echo "promoted $TARGET. rollback: kubectl patch svc $SVC -p '{\"spec\":{\"selector\":{\"app\":\"$SVC\",\"color\":\"$LIVE\"}}}'"
