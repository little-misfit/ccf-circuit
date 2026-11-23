#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
case "${1:-serve}" in
  sync) python3 sync_ccf.py --output conferences.js ;;
  serve)
    if [ ! -f conferences.js ]; then python3 sync_ccf.py --output conferences.js; fi
    python3 -m http.server "${2:-8769}" --bind 127.0.0.1 ;;
  check) "${NODE_BIN:-node}" check.cjs ;;
  *) echo 'Usage: bash run.sh [sync|serve [port]|check]' >&2; exit 2 ;;
esac
