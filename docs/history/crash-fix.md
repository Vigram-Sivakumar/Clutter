# 🚨 Crash Fix - Missing `level` Attribute

## The Problem

**You reported:** "After adding subtask when I pressed enter the app crashed, HTML is empty"

**Root Cause:** When creating new blocks via Enter, we were copying `parentBlockId` and `parentToggleId`, but **NOT** setting the `level` attribute. 

The node tried to **render immediately** before `BlockIdGenerator` could run and compute the correct level, causing a crash.

---

## The Fix (Applied)

Added explicit `level` attribute to ALL block creation calls:

### **1. ListBlock Enter Handler**
```typescript
attrs: {
  listType: attrs.listType,
  checked: attrs.listType === 'task' ? false : null,
  level: attrs.level || 0,  // ✅ FIXED: Copy current level
  ...siblingAttrs,
}
```

### **2. Paragraph Split Handler**
```typescript
attrs: {
  level: currentAttrs.level || 0,  // ✅ FIXED: Copy current level
  ...siblingAttrs,
  tags: [],
}
```

### **3. ToggleHeader Child Creation** (3 locations)
```typescript
// For toggle children (one level deeper)
attrs: {
  level: (attrs.level || 0) + 1,  // ✅ FIXED: Child is one level deeper
  parentBlockId: attrs.blockId,
  parentToggleId: attrs.toggleId,
}

// For toggle siblings (same level)
attrs: {
  level: attrs.level || 0,  // ✅ FIXED: Same level as toggle
  ...siblingAttrs,
}
```

### **4. CodeBlock Exit**
```typescript
const newParagraph = paragraphType.create({
  level: attrs.level || 0,  // ✅ FIXED: Same level as code block
  ...siblingAttrs,
});
```

### **5. ListBlock to Paragraph Conversion**
```typescript
const paragraphNode = paragraphType.create({
  level: listBlockAttrs.level || 0,  // ✅ FIXED: Preserve current level
  ...siblingAttrs,
}, content);
```

### **6. ToggleHeaderAttrs Interface**
```typescript
export interface ToggleHeaderAttrs {
  blockId: string;
  parentBlockId: string | null;
  collapsed: boolean;
  toggleId: string;
  level: number;  // ✅ FIXED: Added missing field
  parentToggleId: string | null;
}
```

---

## Why This Fixes the Crash

### **Before (Crashed):**
```
User presses Enter on subtask
    ↓
Create new list item with: { listType, checked, parentBlockId, parentToggleId }
    ↓
Node tries to render IMMEDIATELY
    ↓
React component reads: node.attrs.level
    ↓
❌ CRASH: level is undefined!
```

### **After (Fixed):**
```
User presses Enter on subtask
    ↓
Create new list item with: { listType, checked, level: 1, parentBlockId, parentToggleId }
    ↓
Node renders successfully with level: 1
    ↓
Later: BlockIdGenerator runs and syncs level from parentBlockId chain
    ↓
✅ Works perfectly!
```

---

## The Philosophy

**IMPORTANT:** We still follow the architecture law:
- `parentBlockId` is the **source of truth** for hierarchy
- `level` is **derived** from `parentBlockId` chain
- `BlockIdGenerator` will **auto-correct** any mismatches

**BUT:** We must set an **initial level** when creating blocks to prevent render crashes during the brief moment before `BlockIdGenerator` runs.

**Think of it as:**
- `level` = "initial guess" (close enough to prevent crashes)
- `BlockIdGenerator` = "truth enforcer" (corrects if needed)

---

## Files Modified

1. ✅ `ListBlock.ts` - Added `level` to Enter handler and conversion
2. ✅ `Paragraph.ts` - Added `level` to split handler
3. ✅ `ToggleHeader.ts` - Added `level` to all 3 child/sibling creation points + interface
4. ✅ `CodeBlock.ts` - Added `level` to exit handler

---

## Test It Now!

Try the exact scenario that crashed:

1. Create task: `[] Parent task`
2. Press Enter
3. Press Tab (becomes subtask)
4. Type something
5. **Press Enter** ← Should work now (creates `level: 1` subtask)

---

## Status

✅ **FIXED** - All block creation now includes explicit `level`  
✅ **SAFE** - Nodes can render immediately without crashes  
✅ **CORRECT** - BlockIdGenerator still syncs from `parentBlockId`  

**Ready for testing!** 🚀

