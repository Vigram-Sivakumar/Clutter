#!/bin/bash
# Architectural Invariant Checker
# Ensures UI layer never violates editor ownership boundaries

set -e

echo "🔍 Checking editor architectural invariants..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# ============================================
# INVARIANT 1: UI must NOT import EditorEngine
# ============================================
echo ""
echo "📋 Check 1: UI must not import EditorEngine"

if grep -r "import.*EditorEngine.*from.*@clutter/editor" packages/ui/ 2>/dev/null; then
    echo -e "${RED}❌ VIOLATION: packages/ui imports EditorEngine${NC}"
    echo "   UI components must use declarative props, not engine imperatives"
    echo "   Location: packages/ui/"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ PASS: No UI imports of EditorEngine${NC}"
fi

# ============================================
# INVARIANT 2: Only ONE canonical EditorCore
# ============================================
echo ""
echo "📋 Check 2: Only one canonical EditorCore.tsx"

EDITOR_CORE_COUNT=$(find packages/ -name "EditorCore.tsx" -type f | wc -l | tr -d ' ')

if [ "$EDITOR_CORE_COUNT" -ne 1 ]; then
    echo -e "${RED}❌ VIOLATION: Found $EDITOR_CORE_COUNT EditorCore.tsx files${NC}"
    echo "   Expected: 1 (packages/editor/core/EditorCore.tsx)"
    echo "   Found:"
    find packages/ -name "EditorCore.tsx" -type f
    ERRORS=$((ERRORS + 1))
else
    CANONICAL_PATH=$(find packages/ -name "EditorCore.tsx" -type f)
    if [ "$CANONICAL_PATH" = "packages/editor/core/EditorCore.tsx" ]; then
        echo -e "${GREEN}✅ PASS: Exactly one EditorCore at canonical location${NC}"
    else
        echo -e "${RED}❌ VIOLATION: EditorCore in wrong location${NC}"
        echo "   Expected: packages/editor/core/EditorCore.tsx"
        echo "   Found: $CANONICAL_PATH"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ============================================
# INVARIANT 3: Only ONE EditorEngine class
# ============================================
echo ""
echo "📋 Check 3: Only one EditorEngine implementation"

ENGINE_COUNT=$(grep -r "^export class EditorEngine" packages/ --include="*.ts" | wc -l | tr -d ' ')

if [ "$ENGINE_COUNT" -ne 1 ]; then
    echo -e "${RED}❌ VIOLATION: Found $ENGINE_COUNT EditorEngine class definitions${NC}"
    echo "   Expected: 1"
    echo "   Found:"
    grep -r "^export class EditorEngine" packages/ --include="*.ts"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ PASS: Exactly one EditorEngine class${NC}"
fi

# ============================================
# INVARIANT 4: UI must NOT instantiate engines
# ============================================
echo ""
echo "📋 Check 4: UI must not instantiate EditorEngine"

if grep -r "new EditorEngine(" packages/ui/ --include="*.tsx" --include="*.ts" 2>/dev/null; then
    echo -e "${RED}❌ VIOLATION: UI instantiates EditorEngine${NC}"
    echo "   Engine creation is owned by EditorCore only"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ PASS: UI does not instantiate EditorEngine${NC}"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All architectural invariants maintained${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ $ERRORS architectural violation(s) detected${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📘 Architectural Rules:"
    echo "  1. ONE EditorCore, ONE EditorEngine = Single Source of Truth"
    echo "  2. UI = Render only, zero engine logic"
    echo "  3. packages/editor owns all editor behavior"
    echo "  4. packages/ui imports and renders, never mutates"
    echo ""
    exit 1
fi
