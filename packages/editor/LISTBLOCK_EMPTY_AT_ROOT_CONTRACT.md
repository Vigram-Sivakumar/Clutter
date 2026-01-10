# ListBlock Empty-at-Root Behavior (Canonical Contract)

**Phase**: 2.2.5.5  
**Status**: ✅ LOCKED (Canonical Behavior Documented)

---

## CANONICAL BEHAVIOR

### 1. Empty List at Root + Backspace

**Scenario**:

- List item is empty (no text content)
- Level = 0 (root level, not nested)
- User presses Backspace

**Behavior**: **CONVERT TO PARAGRAPH**

**Rationale**:

- Document invariant preserved (≥1 block must exist)
- User intention: "Exit list mode"
- Paragraph is the canonical "default" block type

**Implementation** (ListBlock.ts lines 290-332):

```typescript
if (context.shouldConvertToParagraph) {
  const paragraphNode = paragraphType.create(
    {
      blockId: crypto.randomUUID(), // NEW blockId
      ...siblingAttrs, // Preserve parentBlockId, level, parentToggleId
    },
    content
  );
  tr.replaceRangeWith(
    listBlockPos,
    listBlockPos + listBlockNode.nodeSize,
    paragraphNode
  );
  return true;
}
```

**Key Details**:

- ✅ Creates NEW blockId (not reused)
- ✅ Preserves structural context (parentBlockId, level, parentToggleId)
- ✅ Content preserved (even if empty)
- ✅ Cursor positioned at start of paragraph

---

### 2. Empty List at Root + Delete

**Scenario**:

- List item is empty (no text content)
- This is the ONLY block in document
- User presses Delete

**Behavior**: **NOOP** (Document Invariant Protected)

**Rationale**:

- Document must always contain ≥1 block (Editor Law)
- Deleting the only block would violate invariant

**Implementation** (ListBlock.ts lines 456-463):

```typescript
if (isEmpty) {
  let blockCount = 0;
  state.doc.descendants((node) => {
    if (node.isBlock && node.type.name !== 'doc') blockCount++;
  });

  if (blockCount <= 1) {
    console.log('🔒 [ListBlock.Delete] Cannot delete only block in document');
    return false; // noop - preserve document invariant
  }

  // If NOT the only block, proceed with deletion via engine
  engine.dispatch(new DeleteBlockCommand(currentBlockId));
  return true;
}
```

**Key Details**:

- ✅ Explicit blockCount check
- ✅ Matches Paragraph.ts behavior (same invariant)
- ✅ Noop = predictable, safe

---

### 3. Empty List at Root + Enter

**Scenario**:

- List item is empty
- Level = 0
- User presses Enter

**Behavior**: **EXIT TO PARAGRAPH** (via keyboard rules)

**Rationale**:

- User intention: "I'm done with the list"
- Matches Notion/Craft behavior

**Implementation**: Handled by keyboard rules (not in ListBlock.ts):

- `exitEmptyList.ts` rule detects context
- Emits `convert-block` intent
- IntentResolver converts to paragraph

---

## CONTRACT SUMMARY

| Scenario                    | Key       | Behavior             | Survivor BlockId | Document Invariant                |
| --------------------------- | --------- | -------------------- | ---------------- | --------------------------------- |
| Empty list at root          | Backspace | Convert to paragraph | NEW blockId      | ✅ Preserved (paragraph exists)   |
| Empty list (only block)     | Delete    | Noop                 | Original         | ✅ Preserved (block not deleted)  |
| Empty list (NOT only block) | Delete    | Delete via engine    | N/A (deleted)    | ✅ Preserved (other blocks exist) |
| Empty list at root          | Enter     | Convert to paragraph | NEW blockId      | ✅ Preserved (paragraph exists)   |

---

## COMPARISON TO PARAGRAPH

For consistency, compare to Paragraph.ts behavior:

| Block Type | Empty + Only Block + Delete | Rationale          |
| ---------- | --------------------------- | ------------------ |
| Paragraph  | Noop                        | Document invariant |
| ListBlock  | Noop                        | Document invariant |

✅ **Behavior is consistent**

---

## VIOLATION RESOLUTION

**Original Audit (Section B.1)**:

> "Empty list at root + Backspace → converts to paragraph"  
> "Contract says: noop (preserve document ≥1 block invariant)"  
> **BUT**: Conversion creates paragraph, so document still has ≥1 block  
> **Question**: Is conversion acceptable, or must list remain as list?

**Resolution** (Locked as Canonical):

✅ **Conversion is acceptable and CORRECT.**

**Reasoning**:

1. Document invariant IS preserved (paragraph replaces list)
2. User intention is to "exit list mode," not "keep empty list"
3. Matches behavior of Notion, Craft, Apple Notes
4. Paragraph is the canonical default block type

**Contract Update**:

- ~~"Empty at root → noop"~~ ❌ (too restrictive)
- **"Empty at root → convert to default block type (paragraph)"** ✅ (correct)

---

## WHY THIS IS THE RIGHT BEHAVIOR

**Emotional UX**:

- Backspace on empty list = "Get me out of list mode"
- NOT "Keep me in an empty list forever"

**Consistency**:

- Empty heading + Enter = paragraph
- Empty callout + Backspace = paragraph
- Empty list + Backspace = paragraph ✅

**Safety**:

- Document invariant preserved
- New blockId prevents identity confusion
- Undo restores original list

---

## EDGE CASES

### What if empty list at root is inside a wrapper?

**Example**:

```
Callout (wrapper)
  └─ Empty List Item (level 0 relative to callout)
```

**Behavior**: Still converts to paragraph, paragraph stays inside callout.

**Why**: `createSiblingAttrs()` preserves `parentBlockId`, so converted paragraph inherits same parent.

✅ **Correct**: Wrapper containment preserved.

---

### What if user wants to keep typing in the list?

**Answer**: They can. Conversion only happens on Backspace when empty.

If they start typing:

- List is no longer empty
- Backspace deletes characters (not converts)

---

## STATUS

**Empty-at-Root Contract**: ✅ LOCKED and DOCUMENTED

**Audit Update Required**: Update `LISTBLOCK_AUDIT.md` Section B.1 to mark this as resolved.

**Implementation**: ✅ CORRECT (no changes needed)

**Documentation**: ✅ COMPLETE
