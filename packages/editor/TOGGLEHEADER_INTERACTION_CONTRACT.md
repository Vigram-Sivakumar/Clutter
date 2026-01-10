# ToggleHeader Interaction Contract (Canonical)

**Phase**: 2.2.6.1  
**Status**: 🔒 LOCKED (Canonical Law)  
**Date**: Phase 2.2.6 (Post-ListBlock Completion)

---

## PURPOSE

Define the complete, non-negotiable interaction contract for **ToggleHeader** blocks.

This is the law. Implementations must conform exactly.

---

## BLOCK DEFINITION

**ToggleHeader**: A collapsible section header that owns child blocks.

**Attributes**:

- `blockId` — Unique identifier
- `parentBlockId` — Parent container (may be root or another container)
- `level` — Heading level (1-3)
- `collapsed` — Boolean, controls child visibility
- Content: Inline text (heading text)

**Hierarchy**:

```
ToggleHeader (parent)
├─ Child Block 1
├─ Child Block 2
└─ Child Block 3
```

**Key Properties**:

- **Parent-Child Relationship**: ToggleHeader owns its children via `parentBlockId`
- **Collapse State**: Children hidden when `collapsed === true`, visible when `false`
- **NOT a List**: Unlike ListBlock, ToggleHeaders do NOT have siblings at different levels

---

## SECTION 1: ENTER KEY BEHAVIOR

### 1.1 Enter at End of Non-Empty Header

**Context**:

- Cursor at end of header text
- Header text is not empty
- Header may or may not have children

**Behavior**: **CREATE SIBLING PARAGRAPH BELOW**

**Rules**:

1. New paragraph created with same `parentBlockId` as header
2. New paragraph inserted AFTER header (and after all its children in document order)
3. Cursor moves to new paragraph
4. Header remains unchanged

**Rationale**:

- User intention: "Continue writing at same level"
- NOT: "Create child of header"

**Edge Case**: If header is last block in parent, new paragraph becomes last child of parent.

---

### 1.2 Enter in Middle of Header

**Context**:

- Cursor in middle of header text
- Split point has text before AND after

**Behavior**: **SPLIT HEADER**

**Rules**:

1. Text before cursor remains in original header (preserves blockId)
2. Text after cursor moves to NEW paragraph created below
3. New paragraph has same `parentBlockId` as header
4. Children remain attached to ORIGINAL header (before split point)
5. Cursor moves to start of new paragraph

**Rationale**:

- Splitting a header demotes the second half to paragraph
- Children stay with the "parent" (first half)

---

### 1.3 Enter on Empty Header

**Context**:

- Header text is completely empty
- Header may or may not have children

**Behavior**: **CONVERT TO PARAGRAPH**

**Rules**:

1. Header converts to paragraph IN PLACE
2. NEW blockId created (not reused)
3. Children remain attached (new paragraph becomes their parent)
4. `parentBlockId` preserved (stays in same container)
5. Cursor at start of paragraph

**Rationale**:

- Empty header = user wants to "exit header mode"
- Matches Notion/Craft behavior

---

### 1.4 Shift+Enter

**Context**:

- Any cursor position

**Behavior**: **INSERT LINE BREAK** (within header)

**Rules**:

1. Inserts `<br>` or newline character within header text
2. No structural change
3. Cursor after line break

**Rationale**:

- Multi-line headers supported

---

## SECTION 2: BACKSPACE KEY BEHAVIOR

### 2.1 Backspace in Middle or End of Header

**Context**:

- Cursor NOT at start of header
- Text exists before cursor

**Behavior**: **DELETE CHARACTER** (PM default)

**Rules**:

1. Delete single character before cursor
2. No structural change

---

### 2.2 Backspace at Start of Empty Header

**Context**:

- Cursor at start of header
- Header text is empty
- Header may have children

**Behavior**: **CONVERT TO PARAGRAPH**

**Rules**:

1. Same as Enter on Empty Header (1.3)
2. NEW blockId created
3. Children remain attached
4. Cursor at start of paragraph

**Rationale**:

- Empty header + Backspace = "Exit header mode"

---

### 2.3 Backspace at Start of Non-Empty Header (Has Previous Block)

**Context**:

- Cursor at start of header
- Header has text
- Previous block exists (any type except structural)

**Behavior**: **MERGE INTO PREVIOUS BLOCK**

**Rules** (Destructive Survivor Rule):

1. Extract header's text content
2. Delete header via `engine.deleteBlock()` (children promoted to header's parent)
3. Insert extracted text at END of previous block
4. Cursor at merge point (boundary between old and new text)
5. **Survivor**: Previous block survives (keeps blockId)

**Child Safety**:

- Header's children promoted to header's `parentBlockId` (Engine Law #8)
- Children inserted at header's original index in parent

**Structural Boundaries**:

- If previous block is structural (code, divider, image) → **noop**

---

### 2.4 Backspace at Start of Non-Empty Header (No Previous Block)

**Context**:

- Cursor at start of header
- Header has text
- No previous block (header is first in parent)

**Behavior**: **NOOP**

**Rules**:

- No action
- Cursor remains at start

**Rationale**:

- Cannot merge without target

---

## SECTION 3: DELETE KEY BEHAVIOR

### 3.1 Delete in Middle or Start of Header

**Context**:

- Cursor NOT at end of header
- Text exists after cursor

**Behavior**: **DELETE CHARACTER FORWARD** (PM default)

**Rules**:

1. Delete single character after cursor
2. No structural change

---

### 3.2 Delete on Empty Header (Only Block in Document)

**Context**:

- Header is empty
- This is the ONLY block in entire document

**Behavior**: **NOOP** (Document Invariant)

**Rules**:

1. No deletion
2. Document must always contain ≥1 block (Editor Law)

---

### 3.3 Delete on Empty Header (NOT Only Block)

**Context**:

- Header is empty
- Other blocks exist in document

**Behavior**: **DELETE VIA ENGINE**

**Rules**:

1. Delete header via `engine.deleteBlock()`
2. Children promoted to header's parent (Engine Law #8)
3. Cursor moves to previous block (end of text)
4. If no previous block, cursor to next block (start of text)

---

### 3.4 Delete at End of Non-Empty Header (Has Next Block)

**Context**:

- Cursor at end of header text
- Header has text
- Next block exists (any type except structural)

**Behavior**: **MERGE NEXT INTO CURRENT**

**Rules** (Destructive Survivor Rule):

1. Extract next block's text content
2. Delete next block via `engine.deleteBlock()` (its children promoted)
3. Insert extracted text at END of current header
4. Cursor at merge point
5. **Survivor**: Current header survives (keeps blockId)

**Child Safety**:

- Next block's children promoted to next block's original parent
- If next block was a sibling, its children become siblings

**Structural Boundaries**:

- If next block is structural (code, divider, image) → **noop**

---

### 3.5 Delete at End of Non-Empty Header (No Next Block)

**Context**:

- Cursor at end of header
- Header has text
- No next block (header's last child is document end, or header has no next sibling)

**Behavior**: **NOOP**

**Rules**:

- No action
- Cursor remains at end

**Rationale**:

- Cannot merge without target

---

## SECTION 4: COLLAPSE/EXPAND BEHAVIOR

### 4.1 Collapse Header

**Trigger**: Click collapse icon OR keyboard shortcut

**Behavior**: **HIDE CHILDREN**

**Rules**:

1. Set `collapsed = true` on header
2. Children remain in tree (NOT deleted)
3. Children's `parentBlockId` unchanged
4. Children hidden in UI only
5. Undo/redo preserves collapse state

**Rendering**:

- Collapsed indicator visible (e.g. `>` icon)
- Children nodes NOT rendered

---

### 4.2 Expand Header

**Trigger**: Click expand icon OR keyboard shortcut

**Behavior**: **SHOW CHILDREN**

**Rules**:

1. Set `collapsed = false` on header
2. Children become visible in UI
3. No structural change

---

### 4.3 Delete Collapsed Header

**Context**:

- Header is collapsed (`collapsed = true`)
- User deletes header (via Delete key, Backspace, or block deletion)

**Behavior**: **DELETE HEADER, PROMOTE CHILDREN** (same as non-collapsed)

**Rules**:

1. Collapse state does NOT affect deletion behavior
2. Children promoted regardless of visibility
3. Engine guarantees child promotion (Engine Law #8)

**Critical Invariant**:

> Collapse is a UI state, not a structural operation.  
> Deleting a collapsed header MUST promote children, not delete them.

---

## SECTION 5: BLOCK IDENTITY

### 5.1 BlockId Preservation

**Merge Operations**:

- Backspace merge → Previous block keeps blockId (header deleted)
- Delete merge → Current header keeps blockId (next deleted)

**Conversion Operations**:

- Header → Paragraph → NEW blockId created (`crypto.randomUUID()`)

**Split Operations**:

- Split header → Original keeps blockId, new paragraph gets NEW blockId

---

### 5.2 ParentBlockId Preservation

**Conversion**:

- Header → Paragraph → `parentBlockId` preserved (stays in same container)

**Merge**:

- Merged text → Survivor's `parentBlockId` unchanged
- Deleted block's children → Promoted to deleted block's `parentBlockId`

---

## SECTION 6: CHILD BEHAVIOR

### 6.1 Children Follow Parent on Move

**Rule**: If header is indented/outdented, children follow.

**Implementation**: Engine's `MoveBlockCommand` updates `parentBlockId` for moved block only.

**Children Update**: Children's `parentBlockId` references the header, so they automatically "follow" in the tree.

---

### 6.2 Children Promoted on Delete

**Rule**: Engine Law #8 (Child Promotion Invariant)

**When header is deleted**:

1. All direct children promoted to header's `parentBlockId`
2. Children inserted at header's original index
3. Grandchildren (children's children) remain attached to their parents

**Undo**:

- Restores header
- Restores children's `parentBlockId` to header
- Deterministic

---

### 6.3 Orphan Safety

**Contract**: Children NEVER have invalid `parentBlockId`.

**Enforcement**: All structural deletions route through `engine.deleteBlock()`.

**Forbidden**:

- Direct ProseMirror `tr.delete()` on header node
- Block-level child handling logic

---

## SECTION 7: EDGE CASES

### 7.1 Nested Toggles

**Scenario**:

```
ToggleHeader A
├─ ToggleHeader B (child of A)
│  └─ Paragraph C (child of B)
└─ Paragraph D (child of A)
```

**Delete ToggleHeader A**:

- A deleted
- B and D promoted to A's parent
- C remains child of B (grandchild untouched)

✅ **Correct**: Engine handles recursively.

---

### 7.2 Toggle Inside Wrapper (Callout/Blockquote)

**Scenario**:

```
Callout
└─ ToggleHeader
   └─ Child
```

**Delete ToggleHeader**:

- Header deleted
- Child promoted to Callout (header's parent)

✅ **Correct**: `parentBlockId` determines promotion target.

---

### 7.3 Empty Toggle at Root

**Scenario**: Empty toggle header, no parent (root level)

**Backspace or Enter**:

- Convert to paragraph ✅
- NEW blockId ✅
- Children remain attached ✅

**Matches**: ListBlock empty-at-root behavior (convert to paragraph)

---

### 7.4 Toggle with No Children

**Valid**: ToggleHeader with zero children is allowed.

**Collapse Icon**: May be hidden or shown as "empty toggle".

**Behavior**: No special cases. Follows all standard rules.

---

## SECTION 8: DOCUMENT INVARIANTS

### 8.1 Document Must Contain ≥1 Block

**Rule**: Deleting the last block in document is forbidden.

**Implementation**: Check `blockCount` before deletion.

**Example**:

```typescript
if (blockCount <= 1) {
  console.log('🔒 Cannot delete only block in document');
  return false; // noop
}
```

---

### 8.2 Structural Boundaries

**Rule**: Cannot merge with structural blocks (code, divider, image).

**Implementation**: Check next/previous block type before merge.

**Example**:

```typescript
const isStructural = ['codeBlock', 'divider', 'image'].includes(
  nextBlock.type.name
);
if (isStructural) return false; // noop
```

---

## SECTION 9: CURSOR & SELECTION LAW

### 9.1 Cursor Positioning (Deterministic)

**After Merge**:

- Cursor at merge point (boundary between original and inserted text)
- Use `TextSelection.create(doc, mergePos)`

**After Delete**:

- Cursor to previous block (end of text) if exists
- Else cursor to next block (start of text)
- Use `TextSelection.near($pos, bias)`

**After Conversion**:

- Cursor at start of new paragraph
- Use `TextSelection.near(tr.doc.resolve(pos + 1))`

---

### 9.2 Selection Clearing

**Rule**: All structural operations clear selection.

**Rationale**: Structural changes alter meaning, selection persistence feels buggy.

**Implementation**:

```typescript
engine.clearSelection({ reason: 'structural-change' });
```

---

## SECTION 10: UNDO/REDO GUARANTEES

### 10.1 Command Metadata

**Required**: Every `EditorCommand` stores `beforeState` and `afterState`.

**Includes**:

- Cursor position
- Selection range
- Block structure
- Collapse state (for toggle)

---

### 10.2 Undo Restoration

**Undo must restore**:

1. Deleted header (with original blockId)
2. Children's `parentBlockId` (back to header)
3. Cursor position
4. Collapse state

**Result**: Editor state identical to before command.

---

### 10.3 Redo Consistency

**Redo must**:

1. Reapply same command
2. Produce identical result (deterministic)
3. Restore cursor to post-command position

---

## SECTION 11: VISUAL HIERARCHY

### 11.1 Heading Levels (1-3)

**Level 1**: Largest font, most prominent
**Level 2**: Medium font
**Level 3**: Smallest font (still distinct from paragraph)

**Conversion**: If user changes level, blockId preserved (not a structural change).

---

### 11.2 Collapse Indicator

**Visual**: Icon (e.g. `▼` expanded, `▶` collapsed) next to header text.

**Interaction**: Click to toggle `collapsed` state.

**Keyboard**: Optional shortcut (e.g. `Cmd+Enter` to toggle)

---

## SECTION 12: COMPARISON TO LISTBLOCK

| Aspect           | ListBlock                                           | ToggleHeader                              |
| ---------------- | --------------------------------------------------- | ----------------------------------------- |
| Sibling Nesting  | Has `level` attribute, siblings at different levels | No sibling nesting (parent-child only)    |
| Enter Behavior   | Creates sibling list item                           | Creates sibling paragraph                 |
| Collapse         | No collapse                                         | Has collapse state                        |
| Merge Complexity | Must handle list types (bullet/numbered/task)       | Single type (header)                      |
| Indentation      | Tab/Shift+Tab changes level                         | Not applicable (parent-child via blockId) |

**Key Insight**: ToggleHeader is SIMPLER than ListBlock (no sibling math).

---

## SECTION 13: FORBIDDEN BEHAVIORS

### 13.1 PM Default Merges

**Forbidden**: Returning `false` from Backspace/Delete to let PM handle merge.

**Why**: PM does not route through engine → children orphaned.

**Required**: Explicit merge logic via `engine.deleteBlock()`.

---

### 13.2 Direct ProseMirror Deletion

**Forbidden**: `tr.delete()`, `editor.commands.deleteSelection()` on structural blocks.

**Why**: Bypasses engine child promotion.

**Required**: All structural deletes via `engine.deleteBlock()`.

---

### 13.3 Implicit Child Deletion

**Forbidden**: Deleting header and its children together without promotion.

**Why**: Violates Engine Law #8 (Child Promotion Invariant).

**Required**: Engine promotes children atomically.

---

### 13.4 BlockId Reuse on Conversion

**Forbidden**: Converting header → paragraph with same blockId.

**Why**: Violates identity contract (conversion = new block).

**Required**: `crypto.randomUUID()` on all conversions.

---

## SECTION 14: TESTING REQUIREMENTS

### 14.1 Unit Tests (Engine Level)

**Required Tests**:

1. Delete header with children → children promoted ✅
2. Delete header with grandchildren → grandchildren untouched ✅
3. Undo delete → header + children restored ✅
4. Redo delete → deterministic result ✅

---

### 14.2 Integration Tests (ToggleHeader Level)

**Required Tests**:

1. Backspace merge → previous survives, children promoted ✅
2. Delete merge → current survives, next's children promoted ✅
3. Convert empty → new blockId, children attached ✅
4. Enter at end → sibling created ✅
5. Collapse + delete → children still promoted ✅

---

### 14.3 Smoke Tests (User-Facing)

**Required Scenarios**:

1. Create toggle, add children, collapse, delete → children visible after ✅
2. Nested toggles, delete parent → child toggle promoted ✅
3. Merge nested toggle into paragraph → text merged, children promoted ✅
4. Undo/redo cycles → no orphans, cursor stable ✅

---

## SECTION 15: IMPLEMENTATION CHECKLIST

### Phase 1: Read Existing Code

- [ ] Identify current Backspace/Delete handlers
- [ ] Check for PM default merges (returns `false`)
- [ ] Find all `tr.delete()` calls (forbidden)
- [ ] Audit child handling (likely missing)

### Phase 2: Replace PM Defaults

- [ ] Implement explicit Backspace merge logic
- [ ] Implement explicit Delete merge logic
- [ ] Route all deletes through `engine.deleteBlock()`
- [ ] Add structural boundary checks

### Phase 3: Verify Contracts

- [ ] Test cursor positioning after merges
- [ ] Verify blockId creation on conversions
- [ ] Verify children promoted on delete
- [ ] Test undo/redo cycles

### Phase 4: Document Behavior

- [ ] Update audit doc with findings
- [ ] Mark all violations resolved
- [ ] Lock canonical behavior in contract

---

## STATUS

**Contract**: 🔒 LOCKED (Canonical Law)

**Next Phase**: 2.2.6.2 — ToggleHeader Audit (Find Violations)

**Expected Violations** (based on ListBlock experience):

- PM default merges (likely)
- Missing Delete key handler (likely)
- No child promotion logic (guaranteed)
- Cursor positioning issues (possible)

**Estimated Fixes**: 30-60 minutes (patterns already solved)

---

**This contract is non-negotiable. Implementations must conform.**
