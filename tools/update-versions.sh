#!/usr/bin/env bash
set -euo pipefail

# Bumps the Engine5 docker image version across this repo's docker-compose files.
#
# UBS_PLATFORM_VERSION / POSTRAL_CORE_VERSION do not apply here: this repo *is* the @ubs-platform
# (ubs-mona-mr) source, so it cannot depend on its own published packages.
#
# Usage:
#   tools/update-versions.sh --engine5-version=0.0.20-alpha
# Same value can also be provided via env var: ENGINE5_VERSION

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

UBS_PLATFORM_VERSION=${UBS_PLATFORM_VERSION:-}
POSTRAL_CORE_VERSION=${POSTRAL_CORE_VERSION:-}
ENGINE5_VERSION=${ENGINE5_VERSION:-}

for arg in "$@"; do
  case "$arg" in
    --ubs-platform-version=*) UBS_PLATFORM_VERSION="${arg#*=}" ;;
    --postral-core-version=*) POSTRAL_CORE_VERSION="${arg#*=}" ;;
    --engine5-version=*) ENGINE5_VERSION="${arg#*=}" ;;
    -h|--help) grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [ -n "$UBS_PLATFORM_VERSION" ] || [ -n "$POSTRAL_CORE_VERSION" ]; then
  echo "UBS_PLATFORM_VERSION / POSTRAL_CORE_VERSION are ignored in this repo (it is the @ubs-platform source)." >&2
fi

if [ -z "$ENGINE5_VERSION" ]; then
  echo "Nothing to do: set ENGINE5_VERSION." >&2
  exit 1
fi

# Replaces "org/imgPrefix*:tag" docker image tags, handling both hardcoded tags and
# ${VAR-default} style compose defaults, across the given files.
update_docker_image_tag() {
  local new_tag="$1" org="$2" img_prefix="$3"; shift 3
  local f
  for f in "$@"; do
    [ -f "$f" ] || continue
    ORG="$org" IMG_PREFIX="$img_prefix" NEW_TAG="$new_tag" perl -0777 -pi -e '
      my $org = quotemeta($ENV{ORG});
      my $prefix = quotemeta($ENV{IMG_PREFIX});
      my $tag = $ENV{NEW_TAG};
      s/($org\/$prefix[A-Za-z0-9_.-]*:)(\$\{[A-Z0-9_]+-)?[^"'"'"'\s}]+(\})?/$1 . (defined $2 ? $2 : "") . $tag . (defined $3 ? $3 : "")/ge;
    ' "$f"
    echo "  - $f: $org/$img_prefix* -> :$new_tag"
  done
}

# Updates a "VAR=value" assignment in .env-style files, only if the var is already present.
update_env_var() {
  local var="$1" new_value="$2"; shift 2
  local f
  for f in "$@"; do
    [ -f "$f" ] || continue
    if grep -qE "^${var}=" "$f"; then
      sed -i -E "s|^(${var}=).*|\\1${new_value}|" "$f"
      echo "  - $f: $var=$new_value"
    fi
  done
}

echo "Updating Engine5 to $ENGINE5_VERSION"
update_docker_image_tag "$ENGINE5_VERSION" hcangunduz engine5 infrastructure/docker-compose.yml infrastructure/docker-compose-full.yml
update_env_var ENGINE5_VERSION "$ENGINE5_VERSION" dev.env

echo "Done."
