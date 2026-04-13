#!/usr/bin/env bash
# tag-release.sh - Create an annotated Git release tag and push it.
#
# Usage:
#   ./scripts/tag-release.sh                   # auto-increments patch (v1.2.3 → v1.2.4)
#   ./scripts/tag-release.sh v2.0.0            # explicit tag
#   ./scripts/tag-release.sh v2.0.0 "message"  # explicit tag + custom message
#
# The tag is pushed to origin so Vercel / GitHub Actions can trigger on it.

set -euo pipefail

# ── Helpers ───────────────────────────────────────────────────────────────────
red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[0;33m%s\033[0m\n' "$*"; }

# ── Guard: must be on main and working tree must be clean ─────────────────────
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "main" ]]; then
  red "ERROR: You must be on 'main' to tag a release (currently on '$current_branch')."
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  red "ERROR: Working tree has uncommitted changes. Commit or stash first."
  exit 1
fi

# Pull latest so the tag points at the real HEAD
git pull --ff-only origin main

# ── Determine tag name ────────────────────────────────────────────────────────
if [[ $# -ge 1 ]]; then
  TAG="$1"
else
  # Auto-increment: find the latest semver tag and bump patch
  latest=$(git tag --list 'v[0-9]*' --sort=-version:refname | head -1)
  if [[ -z "$latest" ]]; then
    TAG="v0.1.0"
  else
    IFS='.' read -r major minor patch <<< "${latest#v}"
    TAG="v${major}.${minor}.$((patch + 1))"
  fi
  yellow "No tag specified - auto-incrementing to $TAG"
fi

# Validate semver format
if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  red "ERROR: Tag '$TAG' is not a valid semver (expected vX.Y.Z)."
  exit 1
fi

# Prevent duplicate tags
if git rev-parse "$TAG" &>/dev/null; then
  red "ERROR: Tag '$TAG' already exists."
  exit 1
fi

# ── Build message ─────────────────────────────────────────────────────────────
if [[ $# -ge 2 ]]; then
  MSG="$2"
else
  # Default message: list commits since the previous tag
  prev_tag=$(git tag --list 'v[0-9]*' --sort=-version:refname | head -1)
  if [[ -n "$prev_tag" ]]; then
    MSG="Release $TAG

Changes since $prev_tag:
$(git log --oneline "${prev_tag}..HEAD" | head -20)"
  else
    MSG="Release $TAG - initial release"
  fi
fi

# ── Create and push ───────────────────────────────────────────────────────────
git tag -a "$TAG" -m "$MSG"
green "✓ Created annotated tag $TAG"

git push origin "$TAG"
green "✓ Pushed $TAG to origin"

echo ""
green "Release $TAG is live. Vercel will deploy from this tag."
echo "  GitHub: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//')/releases/tag/$TAG"
