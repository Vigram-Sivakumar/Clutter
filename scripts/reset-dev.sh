#!/bin/bash

# 🔥 Nuclear Dev Reset
# Clears ALL Vite caches and rebuilds packages from scratch
# Use this when you suspect stale compiled code

set -e

echo "🔥 Nuclear Dev Reset - Clearing ALL caches..."

cd "$(dirname "$0")/.."

# 1. Stop dev server
echo "1️⃣ Stopping dev server..."
lsof -ti:1420 | xargs kill -9 2>/dev/null || true
echo "✅ Dev server stopped"

# 2. Kill all Vite caches (all scopes)
echo "2️⃣ Clearing Vite caches..."
rm -rf node_modules/.vite
rm -rf apps/desktop/node_modules/.vite
rm -rf apps/desktop/.vite
rm -rf .vite
echo "✅ Vite caches cleared"

# 3. Kill built artifacts
echo "3️⃣ Clearing built packages..."
rm -rf packages/editor/dist
rm -rf packages/ui/dist
echo "✅ Built packages cleared"

# 4. Rebuild editor explicitly
echo "4️⃣ Rebuilding editor package..."
npm run build --workspace=@clutter/editor
echo "✅ Editor rebuilt"

echo ""
echo "🎉 Nuclear reset complete!"
echo "📝 Now run: npm run dev:desktop"
echo ""
echo "💡 Tip: Look for '[EditorCore] BUILD' log to confirm fresh code is running"
