#!/usr/bin/env bash
# Cancel in-progress Helm operations for a single release so upgrade --install can proceed.
set -euo pipefail

RELEASE="${1:?release name required}"
NAMESPACE="${2:?namespace required}"

if ! helm status "$RELEASE" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Release $RELEASE not found in namespace $NAMESPACE; nothing to unlock."
  exit 0
fi

status=$(helm status "$RELEASE" -n "$NAMESPACE" -o json | jq -r '.info.status')

echo "Release $RELEASE current status: $status"

is_pending() {
  case "$1" in
    pending-upgrade|pending-rollback|pending-install) return 0 ;;
    *) return 1 ;;
  esac
}

delete_pending_release_secrets() {
  kubectl get secrets -n "$NAMESPACE" -l "owner=helm,name=${RELEASE}" -o json | \
    jq -r '.items[] | select(.metadata.labels.status | test("^pending-")) | .metadata.name' | \
    while read -r secret; do
      [ -z "$secret" ] && continue
      echo "Deleting pending Helm release secret: $secret"
      kubectl delete secret "$secret" -n "$NAMESPACE" --ignore-not-found
    done
}

rollback_to_last_deployed() {
  local last_deployed
  last_deployed=$(helm history "$RELEASE" -n "$NAMESPACE" -o json | \
    jq -r '[.[] | select(.status=="deployed")] | last | .revision // empty')

  if [ -z "$last_deployed" ]; then
    echo "No deployed revision found for $RELEASE."
    return 0
  fi

  echo "Rolling back $RELEASE to revision $last_deployed to cancel in-progress operation..."
  helm rollback "$RELEASE" "$last_deployed" -n "$NAMESPACE" --wait=false --timeout 2m || true
}

if [ "$status" = "failed" ]; then
  echo "Release $RELEASE is in failed state; clearing failed revision..."
  delete_pending_release_secrets
  rollback_to_last_deployed
  status=$(helm status "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.info.status // "missing"' || echo "missing")
  echo "Release $RELEASE status after failed revision cleanup: $status"
fi

if is_pending "$status"; then
  last_deployed=$(helm history "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null | \
    jq -r '[.[] | select(.status=="deployed")] | last | .revision // empty' || true)

  if [ -z "$last_deployed" ]; then
    echo "No deployed revision found; uninstalling stuck release..."
    helm uninstall "$RELEASE" -n "$NAMESPACE" --wait=false || true
    delete_pending_release_secrets
  else
    rollback_to_last_deployed
  fi

  status=$(helm status "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.info.status // "missing"' || echo "missing")
  echo "Release $RELEASE status after rollback/uninstall attempt: $status"
fi

if is_pending "$status"; then
  echo "Release still pending; removing pending revision secrets..."
  delete_pending_release_secrets

  status=$(helm status "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.info.status // "missing"' || echo "missing")
  echo "Release $RELEASE status after secret cleanup: $status"
fi

if is_pending "$status"; then
  latest_secret=$(kubectl get secrets -n "$NAMESPACE" -l "owner=helm,name=${RELEASE}" -o json | \
    jq -r '[.items[] | select(.metadata.labels.version != null)] | sort_by(.metadata.labels.version | tonumber) | last | .metadata.name // empty')

  if [ -n "$latest_secret" ]; then
    echo "Marking latest release secret as failed: $latest_secret"
    kubectl label secret "$latest_secret" -n "$NAMESPACE" status=failed --overwrite || true
  fi
fi

if helm status "$RELEASE" -n "$NAMESPACE" >/dev/null 2>&1; then
  helm status "$RELEASE" -n "$NAMESPACE" | sed -n '1,8p'
else
  echo "Release $RELEASE is no longer present after unlock."
fi

echo "Helm force unlock finished for $RELEASE in $NAMESPACE."
