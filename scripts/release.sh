#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# RELEASE SCRIPT
# Creates a git tag, builds, and publishes to GitHub Releases.
# Usage: npm run release
# ══════════════════════════════════════════════════════════════════════════════

set -e

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "Preparing release ${TAG}..."
echo ""

# Sanity checks
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Error: Tag ${TAG} already exists."
  exit 1
fi

# Confirm
echo "  Version:  ${VERSION}"
echo "  Tag:      ${TAG}"
echo "  Branch:   $(git branch --show-current)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Tag
echo ""
echo "Creating tag ${TAG}..."
git tag "${TAG}"

# Build
echo ""
echo "Building..."
npm run build

# Push tag (triggers GitHub release via electron-builder publish)
echo ""
echo "Pushing tag to origin..."
git push origin "${TAG}"

# Publish to GitHub Releases
echo ""
echo "Publishing to GitHub Releases..."
npx electron-builder --config electron-builder.config.js --publish always

echo ""
echo "Release ${TAG} complete."
