# Tab/Shift+Tab Implementation - Phase 1

## ✅ What Was Done

1. **Archived old implementation**: `keyboardHelpers.ts.backup`
2. **Created new Phase 1 implementation**: Simple visual indentation only

## 📋 Phase 1 Behavior

### **Tab (Indent)**
- Increments `level` attribute by 1
- Maximum level: 10
- Visual indentation increases
- **Does NOT change parent relationships yet**
- **Does NOT move subtrees yet**

### **Shift+Tab (Outdent)**
- Decrements `level` attribute by 1
- Minimum level: 0
- Visual indentation decreases
- **Does NOT change parent relationships yet**
- **Does NOT move subtrees yet**

### **Enter on Empty Block**
- If level > 0: Outdents by 1 level
- If level = 0: Converts to paragraph

## 🧪 How to Test Phase 1

### Test 1: Basic Indent/Outdent
1. Create a paragraph, type some text
2. Press **Tab** → Level should increase (visual indent)
3. Press **Tab** again → Level increases more
4. Press **Shift+Tab** → Level decreases
5. Press **Shift+Tab** until level = 0
6. Press **Shift+Tab** again → Should do nothing (already at root)

### Test 2: Multiple Blocks
1. Create 3 paragraphs (A, B, C)
2. On paragraph B, press **Tab** → B indents
3. On paragraph C, press **Tab** twice → C indents more than B
4. Verify visual hierarchy: A (level 0), B (level 1), C (level 2)

### Test 3: Different Block Types
Test Tab/Shift+Tab on:
- Paragraphs ✓
- Headings (H1, H2, H3) ✓
- List items ✓
- Blockquotes ✓
- Callouts ✓
- Code blocks (Alt+Tab/Shift+Tab) ✓

### Test 4: Empty Block Behavior
1. Create a paragraph at level 0
2. Press **Tab** twice (level = 2)
3. Clear all text (empty block)
4. Press **Enter** → Should outdent to level 1
5. Press **Enter** again → Should outdent to level 0
6. Press **Enter** again → Should convert to paragraph

### Test 5: Max Level Limit
1. Create a paragraph
2. Press **Tab** 10 times → Should reach level 10
3. Press **Tab** again → Should do nothing (max level reached)

## ⚠️ Known Limitations (Phase 1)

1. **No parent relationships**: Blocks don't have parent-child structure yet
2. **No subtree movement**: Indenting a block doesn't move its children
3. **No BlockIdGenerator sync**: Level is set manually, not computed from parentBlockId
4. **Independent blocks**: Each block's level is independent

## 📊 Debug Output

Phase 1 has `DEBUG = true` enabled. Check console for:
- `[TAB PHASE-1] INDENT` - Shows indent operations
- `[TAB PHASE-1] OUTDENT` - Shows outdent operations
- `[TAB PHASE-1] INDENT BLOCKED` - Max level reached
- `[TAB PHASE-1] OUTDENT BLOCKED` - Already at root

## 🚀 Next Steps

After testing Phase 1:
- **Phase 2**: Add parent relationships (`parentBlockId`)
- **Phase 3**: Add subtree movement (descendants move with parent)

## 💾 Backup

Original implementation saved as: `keyboardHelpers.ts.backup`

To restore old version:
```bash
mv packages/ui/src/editor/utils/keyboardHelpers.ts.backup packages/ui/src/editor/utils/keyboardHelpers.ts
```

