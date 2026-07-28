#!/usr/bin/env bash
# Verify qelos microservice deployments use the expected image tag.
set -euo pipefail

NAMESPACE="${1:?namespace required}"
EXPECTED_TAG="${2:?expected image tag required (e.g. sha-abc1234)}"

Qelos_DEPLOYMENTS=(
  gateway auth content secrets nocode plugins admin assets drafts ai mcp payments
)

missing=()
for dep in "${Qelos_DEPLOYMENTS[@]}"; do
  if ! kubectl get deployment "$dep" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo "Deployment $dep not found in $NAMESPACE (skipping)"
    continue
  fi

  image=$(kubectl get deployment "$dep" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
  if [[ "$image" != *":$EXPECTED_TAG" ]]; then
    echo "Deployment $dep has image $image, expected tag $EXPECTED_TAG"
    missing+=("$dep")
  else
    echo "Deployment $dep image tag verified: $EXPECTED_TAG"
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::Image tag $EXPECTED_TAG not applied to: ${missing[*]}"
  exit 1
fi

echo "All qelos deployments have image tag $EXPECTED_TAG"
