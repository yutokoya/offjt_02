#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

status=0
case "${1:-}" in
  verify)
    (cd frontend && pnpm verify) || status=1
    (cd backend && bash mvnw verify) || status=1
    ;;
  security)
    (cd frontend && pnpm security) || status=1
    (
      scan_dir=$(mktemp -d) || exit 1
      trap 'rm -f -- "$scan_dir/pom.xml"; rmdir -- "$scan_dir"' EXIT
      (cd backend && bash mvnw -B org.apache.maven.plugins:maven-help-plugin:3.5.1:effective-pom \
        "-Doutput=$scan_dir/pom.xml") || exit 1
      trivy=(docker run --rm --mount "type=bind,source=$scan_dir/pom.xml,target=/scan/pom.xml,readonly")
      if [[ -n "${TRIVY_CA_BUNDLE:-}" ]]; then
        trivy+=(--mount "type=bind,source=$TRIVY_CA_BUNDLE,target=/ca.pem,readonly" --env TRIVY_CACERT=/ca.pem)
      fi
      "${trivy[@]}" aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb \
        fs --no-progress --db-repository ghcr.io/aquasecurity/trivy-db:2 \
        --scanners vuln --severity CRITICAL --exit-code 1 /scan
    ) || status=1
    if [[ "$(git rev-parse --is-shallow-repository)" != false ]]; then
      echo "Gitleaks requires full history. Run git fetch --unshallow first if this is a shallow clone." >&2
      status=1
    else
      scan=(docker run --rm --network none --user "$(id -u):$(id -g)"
        --env GIT_CONFIG_COUNT=1 --env GIT_CONFIG_KEY_0=safe.directory --env GIT_CONFIG_VALUE_0=/repo
        --mount "type=bind,source=$PWD,target=/repo,readonly" --workdir /repo
        ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f)
      "${scan[@]}" git --redact --log-opts=--all . || status=1
      "${scan[@]}" dir --redact . || status=1
    fi
    ;;
  *)
    echo "Usage: bash scripts/gate.sh {verify|security}" >&2
    exit 2
    ;;
esac
exit "$status"
