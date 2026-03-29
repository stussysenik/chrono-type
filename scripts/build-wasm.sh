#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../zig"

echo "Building Zig WASM..."
zig build -Doptimize=ReleaseSmall

WASM_FILE="zig-out/bin/chrono_stats.wasm"
SIZE=$(wc -c < "$WASM_FILE")
echo "Output: $WASM_FILE ($SIZE bytes)"

# Copy to RedwoodJS public if it exists
TARGET="../redwood/web/public/chrono_stats.wasm"
if [ -d "../redwood/web/public" ]; then
    cp "$WASM_FILE" "$TARGET"
    echo "Copied to $TARGET"
fi
