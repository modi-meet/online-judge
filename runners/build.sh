#!/usr/bin/env bash
# builds every runner image as oj/run-<lang>:<tag>. usage: runners/build.sh [tag]
set -euo pipefail
cd "$(dirname "$0")"
TAG="${1:-dev}"
for d in cpp py java node; do
  docker build -q -t "oj/run-$d:$TAG" "$d" && echo "built oj/run-$d:$TAG"
done
