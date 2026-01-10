# ToggleHeader Audit (Phase 2.2.6.2)

**Status**: 🔍 IN PROGRESS  
**File**: `packages/editor/extensions/nodes/ToggleHeader.ts`  
**Contract**: `TOGGLEHEADER_INTERACTION_CONTRACT.md`

---

## AUDIT SUMMARY

**Critical Violations**: 5 🔴  
**High Violations**: 2 🟠  
**Medium Violations**: 3 🟡

**Risk Level**: 🔴 **CRITICAL** (child orphaning possible, PM defaults active)

---

## SECTION 1: ENTER KEY BEHAVIOR

### ✅ 1.1 Shift+Enter — PASS

**Contract**: Insert line break within header

**Implementation** (line 192):

```typescript
'Shift-Enter': createShiftEnterHandler('toggleHeader'),
```

**Status**: ✅ CORRECT

---

### ❌ 1.2 Enter at End of Non-Empty Header — **VIOLATION #1** 🔴

**Contract**: Create SIBLING paragraph below header

**Current Implementation** (lines 288-305):

```typescript
// Not collapsed - create paragraph as child
return editor.chain().insertContentAt(endPos, {
  type: 'paragraph',
  attrs: {
    parentBlockId: attrs.blockId, // ❌ WRONG: Creates CHILD, not SIBLING
    parentToggleId: attrs.toggleId,
  },
});
```

**VIOLATION**: Creates CHILD paragraph instead of SIBLING

**Expected**:

- New paragraph should have same `parentBlockId` as header (sibling relationship)
- New paragraph should be inserted AFTER header (not as child)

**Severity**: 🔴 CRITICAL (incorrect hierarchy)

**Impact**: User expects to continue at same level, but is forced into child level

---

### ⚠️ 1.3 Enter in Middle of Header — **NOT IMPLEMENTED**

**Contract**: Split header, text after cursor → new sibling paragraph

**Current Implementation**: No split logic detected

**Status**: ⚠️ MISSING (likely falls through to PM default)

**Severity**: 🟡 MEDIUM (UX gap, not dangerous)

---

### ❌ 1.4 Enter on Empty Header — **VIOLATION #2** 🔴

**Contract**: Convert to paragraph, NEW blockId, children remain attached

**Current Implementation** (lines 308-329):

```typescript
// Find and detach all children with this toggleId
state.doc.descendants((node, nodePos) => {
  if (
    nodePos > toggleHeaderPos &&
    node.attrs.parentToggleId === attrs.toggleId
  ) {
    // Remove parentToggleId only
    tr.setNodeMarkup(nodePos, undefined, {
      ...node.attrs,
      parentToggleId: null, // ❌ Detaches children
    });
  }
});

// Convert toggle to paragraph
const paragraphNode = state.schema.nodes.paragraph.create(); // ❌ No blockId
```

**VIOLATIONS**:

1. **Detaches children** by removing `parentToggleId` (Contract: children should REMAIN ATTACHED via `parentBlockId`)
2. **No blockId** specified for new paragraph (Contract: NEW blockId required)
3. **Doesn't update `parentBlockId`** on children (orphans created if children's `parentBlockId === toggleBlockId`)

**Severity**: 🔴 CRITICAL (orphans children)

**Expected**:

```typescript
const paragraphNode = state.schema.nodes.paragraph.create({
  blockId: crypto.randomUUID(), // NEW blockId
  parentBlockId: attrs.parentBlockId, // Same parent as toggle
});
// Children's parentBlockId should be updated to new paragraph's blockId
```

---

## SECTION 2: BACKSPACE KEY BEHAVIOR

### ❌ 2.1 Backspace Non-Empty — **VIOLATION #3** 🔴

**Contract**: Backspace at start → merge with previous (explicit engine logic)

**Current Implementation** (lines 341-343):

```typescript
if (!context.isEmpty) {
  return false; // ❌ PM DEFAULT HANDLES NON-EMPTY
}
```

**VIOLATION**: Falls through to PM's `joinBackward` default

**Why Critical**: PM does NOT route through engine → children orphaned on merge

**Severity**: 🔴 CRITICAL (same issue fixed in ListBlock)

**Required**: Explicit merge logic using `engine.deleteBlock()`

---

### ⚠️ 2.2 Backspace Empty — **VIOLATION #4** 🟡

**Contract**: Convert to paragraph, NEW blockId, children remain attached

**Current Implementation** (lines 349-371):

```typescript
// Detach all children (remove parentToggleId from them)
state.doc.descendants((node, nodePos) => {
  if (
    nodePos > toggleHeaderPos &&
    node.attrs.parentToggleId === toggleAttrs.toggleId
  ) {
    tr.setNodeMarkup(nodePos, undefined, {
      ...node.attrs,
      parentToggleId: null, // ❌ Detaches children
    });
  }
});

const paragraphNode = state.schema.nodes.paragraph.create(null, content); // ❌ No blockId
tr.replaceRangeWith(
  toggleHeaderPos,
  toggleHeaderPos + toggleHeaderNode.nodeSize,
  paragraphNode
);
```

**VIOLATIONS**:

1. **Detaches children** (same as Enter on empty)
2. **No blockId** specified for paragraph
3. **Doesn't update `parentBlockId`** on children

**Severity**: 🟡 MEDIUM (orphans children, but user-initiated)

**Same Issue**: Violation #2 (Enter on empty)

---

## SECTION 3: DELETE KEY BEHAVIOR

### ❌ 3.1 Delete Key — **VIOLATION #5** 🔴

**Contract**: Delete at end → merge next into current (explicit engine logic)

**Current Implementation**: ❌ **COMPLETELY MISSING**

**Search Results**:

```bash
grep "Delete:" ToggleHeader.ts  # No matches
grep "'Delete'" ToggleHeader.ts  # No matches
```

**VIOLATION**: Entire Delete contract unimplemented

**Severity**: 🔴 CRITICAL (same issue fixed in ListBlock)

**Required**:

- Delete on empty → delete via engine (children promoted)
- Delete at end → merge next into current (engine-backed)
- Document invariant protection

---

## SECTION 4: COLLAPSE/EXPAND BEHAVIOR

### ✅ 4.1 Collapse/Expand — PASS

**Contract**: Toggle `collapsed` attribute, children visibility controlled by UI

**Implementation** (lines 152-184):

```typescript
toggleCollapse: () =>
  ({ state, dispatch }) => {
    const tr = state.tr.setNodeMarkup(nodePos, undefined, {
      ...attrs,
      collapsed: !attrs.collapsed,
    });
    dispatch(tr);
    return true;
  };
```

**Status**: ✅ CORRECT (updates attribute only, no structural change)

---

### ❌ 4.2 Delete Collapsed Header — **CANNOT VERIFY** 🔴

**Contract**: Deleting collapsed toggle MUST promote children (Engine Law #8)

**Issue**: No Delete key implemented → cannot verify

**When Fixed**: Engine integration will automatically handle this

**Severity**: 🔴 CRITICAL (depends on Violation #5)

---

## SECTION 5: ENGINE INTEGRATION

### ❌ 5.1 No Engine Import — **VIOLATION #6** 🔴

**Search Results**:

```typescript
grep "EditorEngine" ToggleHeader.ts  # No matches
grep "DeleteBlockCommand" ToggleHeader.ts  # No matches
grep "engine.deleteBlock" ToggleHeader.ts  # No matches
```

**VIOLATION**: No engine integration at all

**Impact**:

- All structural operations bypass engine
- Children orphaned on any deletion
- Undo/redo unsafe

**Severity**: 🔴 CRITICAL (foundational issue)

**Required**:

```typescript
import { EditorEngine } from '../../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../../core/engine/command';

function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
}
```

---

## SECTION 6: CHILD HANDLING

### ❌ 6.1 Children Detached, Not Promoted — **VIOLATION #7** 🔴

**Contract**: Children promoted on delete (Engine Law #8)

**Current Implementation** (Enter/Backspace on empty):

```typescript
// Detach all children (remove parentToggleId from them)
state.doc.descendants((node, nodePos) => {
  tr.setNodeMarkup(nodePos, undefined, {
    ...node.attrs,
    parentToggleId: null, // ❌ WRONG: Detaches, doesn't promote
  });
});
```

**VIOLATION**: Removes `parentToggleId` but doesn't update `parentBlockId`

**Why Dangerous**:

- If children have `parentBlockId === toggleBlockId`, they become orphans
- Engine's tree index now has invalid `parentBlockId` references
- Undo/redo cannot restore structure

**Severity**: 🔴 CRITICAL (data corruption)

**Required**: Engine handles all child updates via `engine.deleteBlock()`

---

### ⚠️ 6.2 Enter Creates Children, Not Siblings — **VIOLATION #8** 🟠

**Contract**: Enter at end → create sibling paragraph

**Current**: Creates child paragraph (Violation #1)

**Impact on Child Handling**:

- Forces user into child level unintentionally
- Creates hierarchy user didn't request

**Severity**: 🟠 HIGH (UX violation, not orphaning)

---

## SECTION 7: BLOCKID RULES

### ⚠️ 7.1 BlockId Missing on Conversion — **VIOLATION #9** 🟡

**Contract**: Conversion creates NEW blockId

**Current** (lines 325, 366):

```typescript
// Enter on empty
const paragraphNode = state.schema.nodes.paragraph.create(); // ❌ No blockId

// Backspace on empty
const paragraphNode = state.schema.nodes.paragraph.create(null, content); // ❌ No blockId
```

**VIOLATION**: No `blockId` specified (likely defaults to `null` or auto-generated inconsistently)

**Severity**: 🟡 MEDIUM (identity confusion)

**Required**:

```typescript
const paragraphNode = state.schema.nodes.paragraph.create(
  {
    blockId: crypto.randomUUID(),
    ...otherAttrs,
  },
  content
);
```

---

## SECTION 8: CURSOR POSITIONING

### ⚠️ 7.2 Cursor Positioning Inconsistent — **VIOLATION #10** 🟡

**Contract**: Cursor should be deterministic and re-resolved after structural changes

**Current** (various places):

```typescript
// Enter on empty (line 327)
tr.setSelection(TextSelection.create(tr.doc, toggleHeaderPos + 1)); // ✅ Correct

// Backspace on empty (line 368)
tr.setSelection(
  state.selection.constructor.near(tr.doc.resolve(toggleHeaderPos + 1))
); // ⚠️ Uses state.selection.constructor (fragile)
```

**Issue**: Mixed patterns, `state.selection.constructor` is less explicit than `TextSelection.near`

**Severity**: 🟡 LOW (works but inconsistent)

---

## VIOLATIONS SUMMARY

| #   | Violation                               | Severity    | Contract Section | Type            |
| --- | --------------------------------------- | ----------- | ---------------- | --------------- |
| 1   | Enter creates child (not sibling)       | 🔴 CRITICAL | 1.2              | Behavioral      |
| 2   | Enter on empty detaches children        | 🔴 CRITICAL | 1.4              | Child Safety    |
| 3   | Backspace PM default (orphans children) | 🔴 CRITICAL | 2.1              | Child Safety    |
| 4   | Backspace empty detaches children       | 🟡 MEDIUM   | 2.2              | Child Safety    |
| 5   | Delete key missing                      | 🔴 CRITICAL | 3.1-3.5          | Missing Feature |
| 6   | No engine integration                   | 🔴 CRITICAL | 5.1              | Infrastructure  |
| 7   | Children detached, not promoted         | 🔴 CRITICAL | 6.1              | Child Safety    |
| 8   | Enter hierarchy violation               | 🟠 HIGH     | 6.2              | Behavioral      |
| 9   | BlockId missing on conversion           | 🟡 MEDIUM   | 7.1              | Identity        |
| 10  | Cursor positioning inconsistent         | 🟡 LOW      | 8.1              | UX Polish       |

**Total**: 10 violations (6 CRITICAL + 1 HIGH + 3 MEDIUM)

---

## RISK ASSESSMENT

### 🔴 CRITICAL RISKS (6)

**Child Orphaning**:

- Violations #2, #3, #4, #7: Children orphaned or detached on delete/convert
- Engine Law #8 not enforced
- PM defaults active (no engine routing)

**Missing Features**:

- Violation #5: Delete key completely unimplemented
- Violation #6: No engine integration

**Impact**: Data loss, tree corruption, undo/redo unsafe

---

### 🟠 HIGH RISKS (1)

**Behavioral Violations**:

- Violation #1, #8: Enter creates children instead of siblings
- Forces user into unwanted hierarchy

**Impact**: UX confusion, structural violations

---

### 🟡 MEDIUM RISKS (3)

**Identity/UX Issues**:

- Violation #9: BlockId missing on conversion
- Violation #10: Cursor positioning inconsistent

**Impact**: Identity confusion, minor UX inconsistencies

---

## COMPARISON TO LISTBLOCK (PRE-FIX)

| Issue                      | ListBlock (Pre-Fix) | ToggleHeader (Current) | Same?   |
| -------------------------- | ------------------- | ---------------------- | ------- |
| PM default merges          | ✅ Found            | ✅ Found               | YES     |
| Delete key missing         | ✅ Found            | ✅ Found               | YES     |
| No engine integration      | ✅ Found            | ✅ Found               | YES     |
| Children orphaned          | ✅ Found            | ✅ Found               | YES     |
| BlockId missing on convert | ⚠️ Partial          | ✅ Found               | SIMILAR |

**Insight**: ToggleHeader has IDENTICAL issues to ListBlock (pre-fix)

**Good News**: We already have the fix patterns from ListBlock

---

## EXPECTED FIX TIME

Based on ListBlock experience:

| Phase | Task                                       | Est. Time |
| ----- | ------------------------------------------ | --------- |
| 1     | Add engine imports + helper                | 5 min     |
| 2     | Fix Backspace merge logic                  | 15 min    |
| 3     | Implement Delete key                       | 15 min    |
| 4     | Fix Enter behavior (sibling vs child)      | 10 min    |
| 5     | Fix empty conversions (blockId + children) | 10 min    |
| 6     | Test + verify cursor                       | 10 min    |

**Total**: ~1 hour (reusing ListBlock patterns)

---

## RED FLAGS DETECTED

| Red Flag                       | Found? | Evidence                 |
| ------------------------------ | ------ | ------------------------ |
| PM defaults for merges         | ✅ YES | Line 342: `return false` |
| No engine integration          | ✅ YES | No imports, no calls     |
| Silent child detachment        | ✅ YES | Lines 314-322, 354-363   |
| Delete behaving like Backspace | ❌ N/A | Delete not implemented   |
| BlockId missing                | ✅ YES | Lines 325, 366           |
| Implicit conversions           | ✅ YES | Enter/Backspace on empty |

**5 of 6 red flags detected.**

---

## NEXT PHASE

**Phase 2.2.6.3**: Fix all 10 violations using ListBlock patterns

**Priority Order**:

1. Add engine integration (Violation #6) — foundation
2. Fix Backspace merge (Violation #3) — critical child safety
3. Implement Delete key (Violation #5) — critical missing feature
4. Fix Enter behavior (Violations #1, #8) — behavioral correctness
5. Fix empty conversions (Violations #2, #4, #7, #9) — child safety + identity
6. Polish cursor (Violation #10) — UX consistency

---

**Status**: Audit complete, ready for fixes
