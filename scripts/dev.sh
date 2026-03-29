#!/bin/bash
set -euo pipefail
trap 'kill 0' EXIT

echo "=== ChronoType Dev Server ==="

# Build WASM
echo "[wasm] Building..."
cd "$(dirname "$0")/../zig"
zig build -Doptimize=Debug
cp zig-out/bin/chrono_stats.wasm ../redwood/web/public/chrono_stats.wasm
echo "[wasm] Done."
cd ..

# Start Phoenix
echo "[phoenix] Starting on :4000..."
(cd phoenix && mix ecto.migrate 2>/dev/null; mix phx.server) &

# Start RedwoodJS
echo "[redwood] Starting on :8910..."
(cd redwood && yarn rw dev web) &

echo ""
echo "  App:       http://localhost:8910"
echo "  Dashboard: http://localhost:4000/dashboard"
echo ""

wait
