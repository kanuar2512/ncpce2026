#!/usr/bin/env bash
#
# stamp-version.sh — automatic cache-busting for the ES module imports.
#
# Run at DEPLOY time (in CI, on the checked-out tree) BEFORE the Pages artifact
# is uploaded. It rewrites every `?v=…` in the import URLs to the short hash of
# the last commit that touched front-end code (assets/js, index.html, rise.html).
#
# Why this works and why it's safe:
#   • The version changes only when CODE changes — a data-only snapshot commit
#     leaves the hash untouched, so browsers keep their cached JS.
#   • When code changes, the hash changes, so every module URL changes and
#     browsers refetch — no more manual `?v=` bumping, ever.
#   • It edits the files only in the CI runner (never committed), so the repo
#     keeps a stable placeholder like `?v=4`.
#
# Requires full git history in the runner: checkout with `fetch-depth: 0`.

set -euo pipefail

VER="$(git log -1 --format=%h -- assets/js index.html rise.html 2>/dev/null || true)"
[ -z "${VER:-}" ] && VER="dev"

echo "Stamping front-end asset version: ?v=${VER}"

# Replace ?v=<token> everywhere it appears in the front-end sources.
while IFS= read -r f; do
  sed -i -E "s/\?v=[A-Za-z0-9._-]+/?v=${VER}/g" "$f"
  echo "  stamped ${f}"
done < <(grep -rlF "?v=" index.html rise.html assets/js 2>/dev/null || true)

echo "Done."
