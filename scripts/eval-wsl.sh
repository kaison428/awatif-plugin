#!/usr/bin/env bash
# Run the plugin eval on Linux/WSL2 (the shell sandbox needs it) from a repo
# checked out on the Windows drive. Syncs to a Linux-side copy, then runs it.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/"
DST="${EVAL_DIR:-$HOME/.cache/awatif-plugin-eval}/"

command -v rsync >/dev/null || { echo "rsync missing: sudo apt-get install -y rsync" >&2; exit 1; }

for tool in node npm claude; do
  p="$(command -v "$tool" || true)"
  case "$p" in
    "")     echo "$tool not found in WSL; install it inside WSL" >&2; exit 1 ;;
    /mnt/*) echo "$tool resolves to the Windows install ($p); install it inside WSL" >&2; exit 1 ;;
  esac
done

mkdir -p "$DST"
rsync -a --delete --exclude node_modules --exclude .git "$SRC" "$DST"
cd "$DST"

# Reinstall only when the lockfile changed
if [ ! -d node_modules ] || ! cmp -s package-lock.json node_modules/.lock-snapshot; then
  npm ci
  cp package-lock.json node_modules/.lock-snapshot
fi

exec npm run eval -- "$@"