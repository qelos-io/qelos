#!/usr/bin/env bash
# Prepare cluster for a force deploy: unlock Helm and reset stuck workloads.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE="${1:?release name required}"
NAMESPACE="${2:?namespace required}"

bash "$SCRIPT_DIR/helm-force-unlock.sh" "$RELEASE" "$NAMESPACE"

echo "Checking for failed or stuck deployments in $NAMESPACE..."
kubectl get deployments -n "$NAMESPACE" -o json | jq -r '
  .items[] |
  select(
    (.status.conditions[]? | select(.type == "Progressing" and .reason == "ProgressDeadlineExceeded")) or
    (.status.conditions[]? | select(.type == "Available" and .status == "False"))
  ) |
  .metadata.name
' | while read -r deployment; do
  [ -z "$deployment" ] && continue
  echo "Restarting stuck deployment: $deployment"
  kubectl rollout restart "deployment/$deployment" -n "$NAMESPACE" || true
done

kubectl get pods -n "$NAMESPACE" -o json | jq -r '
  .items[] |
  select(
    .status.phase == "Failed" or
    (.status.containerStatuses[]? | .state.waiting.reason == "CrashLoopBackOff") or
    (.status.containerStatuses[]? | .state.waiting.reason == "ImagePullBackOff")
  ) |
  .metadata.name
' | while read -r pod; do
  [ -z "$pod" ] && continue
  echo "Deleting unhealthy pod: $pod"
  kubectl delete pod "$pod" -n "$NAMESPACE" --ignore-not-found --wait=false || true
done

echo "Helm force prepare finished for $RELEASE in $NAMESPACE."
