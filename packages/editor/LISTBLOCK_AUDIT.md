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

---

## B. Backspace / Delete

### Implementation Overview

**Backspace Ownership**:

1. **ListBlock.ts** (lines 246-315): Handles ONLY empty list items
   - Empty + nested (level > 0) → delegates to keyboard rules (outdent-block intent)
   - Empty + root (level 0) → converts to paragraph (lines 273-311)
   - Non-empty → returns false (PM default handles merge)

2. **BackspaceRules.getEmptyListBlockBackspaceContext**: Detects empty list context
   - Checks cursor at start + empty content
   - Determines if should outdent (level > 0) or convert (level 0)

**Delete Ownership**:

- ❌ **NOT FOUND** - No Delete key handler in ListBlock.ts at all

**Enter Context** (affects Backspace/Delete understanding):

- **splitListItem.ts**: Splits non-empty list items on Enter
- **exitEmptyList.ts**: Converts empty level 0 list to paragraph on Enter
- **outdentEmptyList.ts**: Outdents empty nested list via intent on Enter

---

### B1. Backspace at Start of List Item

**Contract Requirements**:
| Scenario | Contract Behavior | Implementation | Status |
|----------|-------------------|----------------|--------|
| Non-empty, has previous sibling | Merge content into previous sibling | ⚠️ PM default (return false) | ❌ **VIOLATION** |
| Non-empty, first at level | Outdent by one level | ⚠️ PM default (return false) | ❌ **VIOLATION** |
| Non-empty, first at root | Convert to paragraph | ⚠️ PM default (return false) | ❌ **VIOLATION** |
| Empty (any case) | See B2 | ✅ Handled explicitly | ✅ PASS |

**VIOLATION #3: Non-Empty Backspace at Start - RELYING ON PM DEFAULT** 🚨

**Location**: ListBlock.ts lines 246-260

**Evidence**:

```typescript
Backspace: ({ editor }) => {
  const { state } = editor;
  const { selection } = state;
  const { empty } = selection;

  // Only handle if selection is empty (cursor, not range)
  if (!empty) return false;

  // PHASE 1 REFACTOR: Use detector for empty listBlock backspace context
  const context =
    BackspaceRules.getEmptyListBlockBackspaceContext(editor);

  if (!context.isEmpty) {
    return false;  // ❌ PM DEFAULT HANDLES NON-EMPTY
  }
```

**Analysis**:

- Contract requires explicit merge/outdent/convert behavior
- Implementation returns `false` for ALL non-empty cases (line 259)
- This hands control to ProseMirror's default joinBackward behavior
- **RED FLAG**: "Reliance on PM defaults for merges" - exactly what user warned about

**What PM Default Does** (implicit behavior):

- Likely merges with previous block (text concat)
- **Unknown**: Does PM preserve blockId rules?
- **Unknown**: Does PM handle children correctly?
- **Unknown**: Does PM respect list vs non-list boundaries?

**Severity**: HIGH - Contract violation + implicit merge behavior

---

### B1. Merge Rules (When Previous Sibling Exists) - Contract Check

**Contract Requirements**:
| Rule | Contract | Implementation | Status |
|------|----------|----------------|--------|
| Previous sibling's content + current content | ✅ Required | ⚠️ PM default | ❌ UNKNOWN |
| Previous sibling survives (keeps blockId) | ✅ Required | ⚠️ PM default | ❌ UNKNOWN |
| Current item destroyed (blockId deleted) | ✅ Required | ⚠️ PM default | ❌ UNKNOWN |
| Cursor at merge point | ✅ Required | ⚠️ PM default | ❌ UNKNOWN |
| Children of current → children of previous | ✅ Required | ⚠️ PM default | ❌ **LIKELY WRONG** |

**Critical Question**: Does PM default understand `parentBlockId` hierarchy?  
**Answer**: Almost certainly NO - PM doesn't know about our block tree model.

**Expected Failure Mode**: Children become orphaned or incorrectly nested.

---

### B2. Backspace on Empty List Item

**Contract Requirements**:
| Scenario | Contract Behavior | Implementation | Status |
|----------|-------------------|----------------|--------|
| Has previous sibling | Delete, cursor to end of previous | ⚠️ Not implemented | ❌ **VIOLATION** |
| No previous sibling, has parent | Outdent | ✅ Lines 267-270 (intent) | ✅ PASS |
| No previous sibling, at root | noop (document ≥1 block) | ⚠️ Converts to paragraph | ❌ **VIOLATION** |
| Has children | Children promoted before deletion | ⚠️ Not verified | ❌ **UNKNOWN** |

**VIOLATION #4: Empty + Previous Sibling - NOT IMPLEMENTED**

**Contract**: "Has previous sibling → Delete empty item, cursor to end of previous"

**Reality**: Lines 258-260 return false if context.isEmpty is false  
But context only checks if LIST is empty, not if it has previous sibling!

**BackspaceRules.getEmptyListBlockBackspaceContext** (lines 377-425):

- Only checks: empty? at start? level?
- Does NOT check for previous sibling
- Does NOT implement delete+merge logic

**Severity**: HIGH - Core deletion behavior missing

---

**VIOLATION #5: Empty at Root - Converts Instead of Noop**

**Contract**: "No previous sibling, at root → noop (document ≥1 block)"

**Reality**: Lines 273-311 CONVERT to paragraph

**Evidence** (lines 275-311):

```typescript
if (context.shouldConvertToParagraph) {
  // Converts in place - works both inside and outside wrappers
  const paragraphNode = paragraphType.create(
    {
      blockId: crypto.randomUUID(), // ❌ NEW blockId created
      ...siblingAttrs,
    },
    content
  );
  tr.replaceRangeWith(
    listBlockPos,
    listBlockPos + listBlockNode.nodeSize,
    paragraphNode
  );
  editor.view.dispatch(tr);
  return true;
}
```

**Analysis**:

- Empty list at root + Backspace → converts to paragraph
- Contract says: noop (preserve document ≥1 block invariant)
- **BUT**: Conversion creates paragraph, so document still has ≥1 block
- **Question**: Is conversion acceptable, or must list remain as list?

**Contract Interpretation Issue**:

- Paragraph contract (Section 2.2.2): Empty paragraph at root + Backspace → noop
- ListBlock contract: Empty list at root + Backspace → ???

**User's contract says** (Section C1):

> "Non-empty, first at root → Convert to paragraph"

**But** current implementation converts EMPTY list, not non-empty!

**Severity**: MEDIUM - Behavior mismatch with contract, but doesn't violate document invariant

---

### B2. Children Promotion Safety

**Contract**: "Children promoted before deletion (never orphaned)"

**Evidence**: ⚠️ **NOT VISIBLE IN CODE**

**Searches**:

- No `children` reassignment logic in ListBlock Backspace handler
- No call to Engine child promotion method
- No iteration over block.children

**Question**: Where does child promotion happen?

- In Engine MoveBlockCommand? (Section A mentions children follow parent)
- In PM node deletion? (unlikely - PM doesn't know our tree)
- Not at all? (orphans created)

**Severity**: CRITICAL - Cannot verify orphan safety

**Action Required**: Audit Engine deletion logic for child handling

---

### B3. Delete at End of List Item

**Contract**: "Merge next block into current"

| Scenario                   | Contract Behavior         | Implementation | Status           |
| -------------------------- | ------------------------- | -------------- | ---------------- |
| Has next sibling list item | Merge next into current   | ❌ NOT FOUND   | ❌ **VIOLATION** |
| Next block is paragraph    | Merge paragraph into list | ❌ NOT FOUND   | ❌ **VIOLATION** |
| Next block is structural   | noop (cannot merge)       | ❌ NOT FOUND   | ❌ **VIOLATION** |
| No next block              | noop (at document end)    | ❌ NOT FOUND   | ❌ **VIOLATION** |

**VIOLATION #6: Delete Key COMPLETELY MISSING** 🚨

**Location**: ListBlock.ts - NO Delete HANDLER AT ALL

**Search Results**:

```bash
grep "Delete:" ListBlock.ts  # No matches
grep "'Delete'" ListBlock.ts  # No matches
```

**Contract**: "Delete must be symmetric to Backspace, directionally consistent"

**Reality**: Delete key not bound, likely falls through to PM default or nothing

**Severity**: CRITICAL - Entire Delete contract unimplemented

**Expected User Impact**:

- Delete at end of list item → unpredictable behavior
- May delete character forward (PM default text deletion)
- May do nothing
- Definitely does NOT merge with next block as specified

---

### B4. Empty Deletion Invariant

**Contract**: "Document must always contain ≥ 1 block"

**Implementation**: ⚠️ **NOT EXPLICITLY CHECKED**

**Current Behavior**:

- Empty list converts to paragraph (lines 296-310)
- Paragraph creation ensures ≥1 block exists
- But no explicit `blockCount` check like Paragraph.ts has

**From Paragraph audit (Phase 2.2.2 Fix #1)**:

```typescript
// 🔒 EDITOR INVARIANT: Document must always contain ≥ 1 block
let blockCount = 0;
state.doc.descendants((node) => {
  if (node.isBlock && node.type.name !== 'doc') {
    blockCount++;
  }
});

if (blockCount <= 1) {
  return false; // noop
}
```

**ListBlock equivalent**: ❌ NOT FOUND

**Question**: Is conversion to paragraph sufficient protection?  
**Answer**: YES for empty-to-paragraph case, but NO for deletion cases (which aren't implemented)

**Severity**: MEDIUM - Currently safe due to conversion, but fragile

---

### B. Merge Direction & Survivor Rules

**Contract** (Section C, F5):

> "Backspace → previous survives"  
> "Delete → current survives"

**Implementation**: ❌ CANNOT VERIFY

**Reason**:

- Backspace non-empty → PM default (unknown survivor)
- Delete → not implemented at all

**Severity**: HIGH - Core contract rule unverifiable

---

## SECTION B SUMMARY: Backspace / Delete

### ❌ CRITICAL VIOLATIONS (3)

1. **Delete Key Completely Missing** 🚨
   - Entire Delete contract unimplemented
   - No handler in ListBlock.ts
   - Severity: CRITICAL

2. **Backspace Relies on PM Default** 🚨
   - Non-empty Backspace returns false → PM handles
   - Contract requires explicit merge/outdent/convert
   - Unknown: blockId preservation, children handling, boundaries
   - Severity: HIGH

3. **Child Promotion Not Visible** 🚨
   - Contract: "Children promoted before deletion (never orphaned)"
   - Code: No child reassignment logic found
   - Severity: CRITICAL - Cannot verify orphan safety

### ❌ HIGH SEVERITY VIOLATIONS (2)

4. **Empty + Previous Sibling Deletion Missing**
   - Contract: Delete empty, cursor to previous
   - Reality: Not implemented
   - Severity: HIGH

5. **BlockId Rule Violations**
   - exitEmptyList preserves blockId on convert (line 66)
   - Contract (Section E2): Convert creates NEW blockId
   - Severity: MEDIUM

### ⚠️ BEHAVIORAL MISMATCHES (2)

6. **Empty at Root Converts vs Noop**
   - Implementation converts to paragraph
   - Contract unclear if this violates "noop at root"
   - Document invariant still preserved (paragraph exists)
   - Severity: MEDIUM - Needs contract clarification

7. **Merge Direction Unknown**
   - PM default handles merges
   - Survivor rules unverifiable
   - Severity: HIGH

### ⏳ CANNOT AUDIT (Child Safety)

- Child promotion logic not visible in ListBlock
- Possibly in Engine (MoveBlockCommand/DeleteBlockCommand?)
- Must audit Engine deletion to verify orphan safety

---

## RED FLAGS DETECTED (User's Warning List)

| Red Flag                                        | Found?     | Evidence                                 |
| ----------------------------------------------- | ---------- | ---------------------------------------- |
| Reliance on PM defaults for merges              | ✅ YES     | Line 259: `return false` for non-empty   |
| Silent deletes without child promotion          | ⚠️ UNKNOWN | No child logic visible                   |
| Delete behaving like Backspace                  | ❌ N/A     | Delete not implemented                   |
| Paragraph conversion implicit                   | ✅ YES     | Lines 273-311 auto-convert               |
| Cursor repositioning without explicit selection | ✅ YES     | Line 309: TextSelection.near             |
| BlockId reuse or regeneration during merge      | ✅ YES     | Line 298: crypto.randomUUID() on convert |

**4 of 6 red flags detected or unknown.**

---

## NEXT SECTION: Enter Semantics

⏳ **NOT AUDITED YET**

---

**Section B Audit Complete. Awaiting instructions for Section C (Enter) or fix prioritization.**
