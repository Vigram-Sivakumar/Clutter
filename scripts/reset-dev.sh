#!/bin/bash

# 🔥 Nuclear Dev Reset
# Clears ALL caches (Vite + WebView) and rebuilds packages from scratch
# Use this when you suspect stale compiled code

set -e

echo "🔥 Nuclear Dev Reset - Clearing ALL caches..."

cd "$(dirname "$0")/.."

# 1. Kill Tauri app (to clear WebView cache)
echo "1️⃣ Killing Tauri app..."
pkill -9 -f "clutter" 2>/dev/null || true
echo "✅ Tauri app killed"

# 2. Stop dev server
echo "2️⃣ Stopping dev server..."
lsof -ti:1420 | xargs kill -9 2>/dev/null || true
echo "✅ Dev server stopped"

# 3. Kill all Vite caches (all scopes)
echo "3️⃣ Clearing Vite caches..."
rm -rf node_modules/.vite
rm -rf apps/desktop/node_modules/.vite
rm -rf apps/desktop/.vite
rm -rf .vite
echo "✅ Vite caches cleared"

# 4. Kill WebView caches (macOS-specific)
echo "4️⃣ Clearing WebView caches..."
rm -rf ~/Library/Caches/com.clutter.notes.desktop 2>/dev/null || true
rm -rf ~/Library/WebKit/com.clutter.notes.desktop 2>/dev/null || true
echo "✅ WebView caches cleared"

# 5. Kill built artifacts
echo "5️⃣ Clearing built packages..."
rm -rf packages/editor/dist
rm -rf packages/ui/dist
echo "✅ Built packages cleared"

# 6. Rebuild editor explicitly
echo "6️⃣ Rebuilding editor package..."
npm run build --workspace=@clutter/editor
echo "✅ Editor rebuilt"

echo ""
echo "🎉 Nuclear reset complete!"
echo "📝 Now run: npm run dev:desktop"
echo ""
echo "💡 CRITICAL: Look for '[EditorCore] BUILD' log to confirm fresh code is running"
echo "   If BUILD log is missing → WebView still has cached modules"
