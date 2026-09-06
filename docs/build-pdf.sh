#!/usr/bin/env bash
# Renders docs to PDF, light theme. Usage: ./build-pdf.sh [hld|lld|all]
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

build () {
  local name="$1"
  [ -f "$name.md" ] && python3 md2doc.py "$name.md" "$name.html"   # generated docs
  python3 make-print-html.py "$name.html" "$name-print.html"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --virtual-time-budget=20000 \
    --print-to-pdf="$PWD/$name.pdf" "file://$PWD/$name-print.html" 2>/dev/null
  echo "  $name.pdf  ($(python3 -c "import sys;print(__import__('subprocess').run(['pdfinfo','$name.pdf'],capture_output=True,text=True).stdout.split('Pages:')[1].split()[0])") pages)"
}

case "${1:-all}" in
  all) build hld; build lld ;;
  *)   build "$1" ;;
esac
