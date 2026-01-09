# ListBlock Interaction Contract - AUDIT REPORT

**Status**: 🔍 IN PROGRESS  
**Date**: Phase 2.2.3.1 - ListBlock Audit (Read-Only)  
**Auditor**: System Review against Canonical Contract

---

## AUDIT ORDER

1. ✅ Indent / Outdent (Tab / Shift+Tab) - IN PROGRESS
2. ⏳ Backspace / Delete
3. ⏳ Enter semantics
4. ⏳ Child promotion / orphan safety
5. ⏳ Undo/redo integrity
6. ⏳ Selection + arrow navigation

---

## 0. Core Invariants

| Invariant                                        | Expected         | Implementation                     | Status              |
| ------------------------------------------------ | ---------------- | ---------------------------------- | ------------------- |
| ListBlock always has exactly one `blockId`       | ✅ YES           | Lines 74-82 (attributes)           | ✅ PASS             |
| ListBlock always has exactly one `parentBlockId` | ✅ YES (or null) | Lines 83-93 (attributes)           | ✅ PASS             |
| `level` is derived, never set directly           | ✅ YES           | Lines 100-105 (attribute)          | ⚠️ **NEEDS VERIFY** |
| Can exist empty                                  | ✅ YES           | `content: 'inline*'` (line 66)     | ✅ PASS             |
| Hierarchy via `parentBlockId`, not DOM           | ✅ YES           | Attribute-based (line 83)          | ✅ PASS             |
| Children follow parent deletion                  | ✅ YES (promote) | ?                                  | ⏳ **NOT AUDITED**  |
| List type independent of hierarchy               | ✅ YES           | `listType` attribute (lines 94-99) | ✅ PASS             |

**Note on `level`**: Contract says "level is derived from parentBlockId, never set directly."  
Implementation has `level` as editable attribute (lines 100-105).  
BlockIdGenerator plugin computes `level` from `parentBlockId` (external sync).  
**Question**: Is this safe? Can `level` drift from `parentBlockId`?

---

## A. Indentation & Hierarchy

### Implementation Flow

**Ownership Chain**:

1. **ListBlock.ts** (lines 223-225): Explicitly does NOT handle Tab/Shift+Tab
2. **KeyboardShortcuts.ts**: Binds Tab/Shift+Tab → `handleTab(editor, isShift)`
3. **indentBlock.ts** & **outdentBlock.ts**: Rules emit `indent-block`/`outdent-block` intents
4. **IntentResolver**: `handleIndentBlock()` & `handleOutdentBlock()` execute via `MoveBlockCommand`
5. **MoveBlockCommand**: Updates `parentBlockId` in Engine + ProseMirror
6. **BlockIdGenerator**: Syncs `level` based on `parentBlockId`

**Verdict**: ✅ Correct ownership - keyboard rules + intent resolver handle structure

---

### A1. Tab (Indent)

**Contract**: "Make this block a child of the previous sibling"

| Scenario                           | Contract Behavior                               | Implementation                   | Status           |
| ---------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------- |
| Has previous sibling at same level | Indent: set `parentBlockId` to previous sibling | ✅ IntentResolver lines 430-442  | ✅ PASS          |
| No previous sibling at same level  | noop                                            | ✅ IntentResolver lines 434-440  | ✅ PASS          |
| Already indented                   | Can indent further if has previous sibling      | ✅ Same logic applies            | ✅ PASS          |
| Cursor anywhere in text            | Indent affects entire block                     | ✅ Intent has no cursor position | ✅ PASS          |
| Empty list item                    | Indent works                                    | ✅ No emptiness check            | ✅ PASS          |
| Multiple blocks selected           | Apply to all in order                           | ⚠️ **NOT IMPLEMENTED**           | ❌ **VIOLATION** |

**VIOLATION #1: Multiple Block Selection**

- **Contract**: "Multiple blocks selected → Apply to all in document order"
- **Reality**: Intent resolver handles single `blockId` only (line 408)
- **Severity**: MEDIUM - Feature gap, not correctness bug
- **Location**: IntentResolver.handleIndentBlock() - no loop over selection

---

### A1. Tab Invariants

| Invariant                            | Contract         | Implementation                                 | Status  |
| ------------------------------------ | ---------------- | ---------------------------------------------- | ------- |
| Tab NEVER inserts spaces/tabs        | ✅ Required      | ✅ No text mutation                            | ✅ PASS |
| Tab is block-level, not cursor-level | ✅ Required      | ✅ Intent is `blockId` only                    | ✅ PASS |
| Previous sibling becomes parent      | ✅ Required      | ✅ Lines 442, 479                              | ✅ PASS |
| Parent's `level` + 1 = new `level`   | ✅ Auto-computed | ✅ BlockIdGenerator                            | ✅ PASS |
| Children move with parent            | ✅ Required      | ✅ Engine tree (parent moves, children follow) | ✅ PASS |
| BlockId preserved                    | ✅ Required      | ✅ MoveBlockCommand (no ID change)             | ✅ PASS |

**All invariants PASS** ✅

---

### A1. Tab Edge Cases

| Edge Case                    | Contract                          | Implementation   | Status             |
| ---------------------------- | --------------------------------- | ---------------- | ------------------ |
| First item in list           | noop (no previous sibling)        | ✅ Lines 434-440 | ✅ PASS            |
| Previous sibling is non-list | noop (cannot nest under non-list) | ⚠️ **UNKNOWN**   | ⚠️ **NEEDS AUDIT** |

**Question**: Does `canNest()` policy (line 454) check block types?  
**Location to audit**: EditorEngine.canNest() implementation

---

### A2. Shift+Tab (Outdent)

**Contract**: "Pull this block out one level toward root"

| Scenario                         | Contract Behavior                               | Implementation                   | Status           |
| -------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------- |
| Nested (has `parentBlockId`)     | Outdent: set `parentBlockId` to parent's parent | ✅ Lines 523-530, 547-551        | ✅ PASS          |
| At root (`parentBlockId` = null) | noop                                            | ✅ Lines 514-520                 | ✅ PASS          |
| Has children                     | Children follow parent (Option 1)               | ✅ Engine tree behavior          | ✅ PASS          |
| Cursor anywhere                  | Outdent affects entire block                    | ✅ Intent has no cursor position | ✅ PASS          |
| Empty list item                  | Outdent works                                   | ✅ No emptiness check            | ✅ PASS          |
| Multiple blocks selected         | Apply to all in order                           | ⚠️ **NOT IMPLEMENTED**           | ❌ **VIOLATION** |

**VIOLATION #2: Multiple Block Selection**

- **Contract**: "Multiple blocks selected → Apply to all in document order"
- **Reality**: Intent resolver handles single `blockId` only (line 500)
- **Severity**: MEDIUM - Feature gap, not correctness bug
- **Location**: IntentResolver.handleOutdentBlock() - no loop over selection

---

### A2. Shift+Tab Invariants

| Invariant                          | Contract         | Implementation                     | Status  |
| ---------------------------------- | ---------------- | ---------------------------------- | ------- |
| Block-level, not cursor-level      | ✅ Required      | ✅ Intent is `blockId` only        | ✅ PASS |
| Parent's parent becomes new parent | ✅ Required      | ✅ Lines 523, 550                  | ✅ PASS |
| `level` decreases by 1             | ✅ Auto-computed | ✅ BlockIdGenerator                | ✅ PASS |
| BlockId preserved                  | ✅ Required      | ✅ MoveBlockCommand (no ID change) | ✅ PASS |
| Children behavior explicit         | ✅ Follow parent | ✅ Engine tree                     | ✅ PASS |

**All invariants PASS** ✅

---

### A2. Shift+Tab Edge Cases

| Edge Case             | Contract                           | Implementation                | Status  |
| --------------------- | ---------------------------------- | ----------------------------- | ------- |
| Only child of parent  | Simple outdent                     | ✅ No special handling needed | ✅ PASS |
| First child of parent | Outdent, siblings stay             | ✅ Index-based (line 551)     | ✅ PASS |
| Middle child          | Outdent, siblings stay with parent | ✅ Index-based logic          | ✅ PASS |

**All edge cases handled correctly** ✅

---

### A3. Child Promotion Rules

**Contract Choice**: **Children Follow Parent** (Option 1)

**Implementation**: ✅ **CORRECT**

**Evidence**:

- IntentResolver moves block via `MoveBlockCommand`
- `MoveBlockCommand` updates block's `parentBlockId`
- Children's `parentBlockId` still points to their parent (the moved block)
- Engine tree structure: children follow parent as a unit

**Verdict**: ✅ Contract compliant - children follow parent on indent/outdent

---

### A4. Maximum Nesting Depth

**Contract**: `MAX_INDENT_LEVEL` exists, Tab at max → noop

**Implementation**: ⚠️ **NEEDS VERIFICATION**

**Evidence**:

- BlockIdGenerator mentioned in Phase 2.2.2 (root fix)
- Contract says "level is clamped at max (BlockIdGenerator handles this)"
- No MAX_INDENT_LEVEL check visible in IntentResolver

**Question**: Where is MAX_INDENT_LEVEL enforced?  
**Action Required**: Audit BlockIdGenerator plugin for level clamping

---

### A5. Previous Sibling Dependency Law ⭐

**Contract**: "A block can only indent if there is a previous sibling _at the same level_"

**Definition**: Previous sibling = last block in document order before current with same `parentBlockId`

**Implementation**: ✅ **EXACTLY CORRECT**

**Evidence** (IntentResolver lines 420-442):

```typescript
const parent = this._engine.getParent(blockId);
const siblings = parent.children; // ← Children of SAME parent
const index = siblings.indexOf(blockId);

if (index <= 0) {
  // ← First in sibling array
  return { success: false, reason: 'No previous sibling' };
}

const previousSiblingId = siblings[index - 1]; // ← Previous in SAME parent
```

**Analysis**:

- ✅ Gets siblings from same parent (same `parentBlockId`)
- ✅ Uses document order (`index - 1`)
- ✅ Explicitly checks index <= 0 (first item)
- ✅ Previous sibling MUST exist at same level

**Verdict**: ✅ **CANONICAL IMPLEMENTATION** - This is exactly right!

---

## SECTION A SUMMARY: Indent / Outdent

### ✅ PASSES (Strong Implementation)

1. **Core indent/outdent logic**: CORRECT
   - Previous sibling dependency law ✅
   - Parent-child relationships ✅
   - BlockId preservation ✅
   - Children follow parent ✅

2. **Edge cases**: HANDLED
   - First item → noop ✅
   - At root → noop ✅
   - No previous sibling → noop ✅

3. **Invariants**: ENFORCED
   - Tab is structural, not textual ✅
   - Level is auto-computed ✅
   - Hierarchy via parentBlockId ✅

### ❌ VIOLATIONS (2 found)

1. **Multiple Block Selection** (MEDIUM severity)
   - Contract requires multi-select support
   - Implementation handles single block only
   - Feature gap, not correctness bug

2. **Type Safety** (needs verification)
   - `canNest()` policy check exists but unclear if it checks block types
   - Contract: "Cannot nest under non-list blocks"

### ⚠️ NEEDS VERIFICATION (2 items)

1. **MAX_INDENT_LEVEL enforcement**
   - Contract requires max depth clamping
   - Mentioned as BlockIdGenerator responsibility
   - Not visible in Intent

Resolver code

2. **Level drift safety**
   - `level` is editable attribute
   - BlockIdGenerator syncs from `parentBlockId`
   - Question: Can level drift from parentBlockId between syncs?

---

## NEXT SECTION: Backspace / Delete

⏳ **NOT AUDITED YET**

---

**Section A Audit Complete. Awaiting instructions for Section B (Backspace/Delete).**
