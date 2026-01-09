# Undo Grouping Law (Constitutional)

**Status:** ✅ Canonical  
**Created:** 2026-01-09  
**Purpose:** Define the rules for grouping EditorCommands into emotional undo steps

---

## 0. First Principle (Non-Negotiable)

> **Undo must feel like rewinding time, not executing inverse operations.**

Users do not think in commands. They think in intentions.

**Examples:**

- "I typed this sentence" ← one undo
- "I indented three blocks" ← one undo
- "I deleted a paragraph" ← one undo

If undo surprises even once, confidence drops permanently.

---

## 1. The Grouping Window

### Rule: Time-Based Grouping

Commands may be grouped **only if**:

- Same intent category
- Same target block
- Within **500ms** of each other

### Hard Breaks (Never Group Across These)

The following actions **always** start a new undo group:

1. **Structural Changes**
   - Enter key (creates new block)
   - Delete empty block
   - Convert block type
   - Indent/outdent
   - Move block

2. **Selection Changes**
   - Ctrl+A escalation
   - Block selection (vs text selection)
   - Click to different block

3. **External Actions**
   - Paste
   - Drag-and-drop
   - Toolbar commands
   - Slash commands

4. **User Pause**
   - No activity for >500ms
   - Focus loss

---

## 2. Intent Compatibility Matrix

### What Can Be Grouped

| Intent Category | Can Group With                             | Cannot Group With     |
| --------------- | ------------------------------------------ | --------------------- |
| Text insertion  | Text insertion (same block)                | Deletion, structural  |
| Text deletion   | Text deletion (same block, same direction) | Insertion, structural |
| Formatting      | Formatting (same selection)                | Anything else         |
| Structural      | **Never groups**                           | Everything            |

### Examples

#### ✅ Groupable

```
Type "H" → Type "e" → Type "l" → Type "l" → Type "o"
Result: 1 undo step
```

```
Backspace 5 times rapidly
Result: 1 undo step
```

```
Bold → Italic → Underline (same selection)
Result: 1 undo step
```

#### ❌ Not Groupable

```
Type "Hello" → Press Enter → Type "World"
Result: 3 undo steps (text, enter, text)
```

```
Delete char → Indent block
Result: 2 undo steps (delete, indent)
```

```
Type in Block A → Click Block B → Type
Result: 2 undo steps (pause + focus change)
```

---

## 3. Command Metadata (Required)

Every `EditorCommand` must carry:

```typescript
interface EditorCommand {
  // Existing
  apply(engine: EditorEngine): void;
  undo(engine: EditorEngine): void;

  // NEW: Grouping metadata
  metadata: {
    intentCategory: IntentCategory;
    targetBlockId: BlockId;
    timestamp: number;

    // Selection state restoration
    beforeSelection: EditorSelection;
    afterSelection: EditorSelection;
    beforeFocus: EditorFocus;
    afterFocus: EditorFocus;
    beforeCursor: EditorCursor | null;
    afterCursor: EditorCursor | null;
  };
}
```

### Intent Categories

```typescript
type IntentCategory =
  | 'text-insert'
  | 'text-delete-forward'
  | 'text-delete-backward'
  | 'format'
  | 'block-create'
  | 'block-delete'
  | 'block-convert'
  | 'block-move'
  | 'block-indent'
  | 'block-outdent'
  | 'selection-change'
  | 'paste'
  | 'external';
```

---

## 4. Cursor & Selection Restoration (Critical)

### Rule: Undo ALWAYS Restores Full State

When undoing a command (or group), restore:

1. Block structure
2. Text content
3. Cursor position
4. Selection range/type
5. Focus block

**Never:**

- Leave cursor in wrong block
- Leave selection collapsed when it was ranged
- Jump focus unexpectedly

### Apple Notes Behavior (Reference)

| Action           | Undo Restores                             |
| ---------------- | ----------------------------------------- |
| Type word        | Deletes word, cursor at original position |
| Delete selection | Re-inserts text, selection restored       |
| Indent block     | Moves back, cursor stays in block         |
| Create block     | Deletes block, cursor in previous block   |

**Invariant:** After undo + redo, state is identical to before undo.

---

## 5. The Grouping Algorithm (Exact)

```typescript
function shouldGroupWithPrevious(
  prevCommand: EditorCommand,
  newCommand: EditorCommand
): boolean {
  const timeDelta =
    newCommand.metadata.timestamp - prevCommand.metadata.timestamp;

  // Rule 1: Time window
  if (timeDelta > 500) return false;

  // Rule 2: Intent compatibility
  if (
    !areIntentsCompatible(
      prevCommand.metadata.intentCategory,
      newCommand.metadata.intentCategory
    )
  ) {
    return false;
  }

  // Rule 3: Same target block
  if (
    prevCommand.metadata.targetBlockId !== newCommand.metadata.targetBlockId
  ) {
    return false;
  }

  // Rule 4: Structural changes never group
  const structuralCategories = [
    'block-create',
    'block-delete',
    'block-convert',
    'block-move',
    'block-indent',
    'block-outdent',
  ];

  if (structuralCategories.includes(newCommand.metadata.intentCategory)) {
    return false;
  }

  return true;
}

function areIntentsCompatible(a: IntentCategory, b: IntentCategory): boolean {
  // Text insertion groups with text insertion
  if (a === 'text-insert' && b === 'text-insert') return true;

  // Deletion groups with deletion in same direction
  if (a === 'text-delete-forward' && b === 'text-delete-forward') return true;
  if (a === 'text-delete-backward' && b === 'text-delete-backward') return true;

  // Formatting groups with formatting
  if (a === 'format' && b === 'format') return true;

  // Nothing else groups
  return false;
}
```

---

## 6. The UndoController (Authority)

### Responsibility

- Owns command history
- Implements grouping logic
- Restores full state on undo/redo
- Exposes `undo()` and `redo()` to UI

### Does NOT

- Care about TipTap
- Care about React
- Care about keyboard shortcuts

It is a pure state machine.

---

## 7. Edge Cases (Explicit Decisions)

### Case: User types, pauses 600ms, continues

**Result:** 2 undo groups (hard break at pause)

### Case: User deletes forward once, then backward once

**Result:** 2 undo groups (different directions)

### Case: User indents 3 blocks rapidly

**Result:** 3 undo groups (structural never groups)

### Case: User types in Block A, clicks Block B, immediately types

**Result:** 2 undo groups (focus change is hard break)

### Case: User applies bold, italic, underline to same selection

**Result:** 1 undo group (same intent category, same selection)

### Case: Undo after selection change

**Result:** Selection restored to state before last command group

---

## 8. Testing Checklist

To verify Emotional Undo is correct:

- [ ] Type a sentence → 1 undo removes entire sentence
- [ ] Type, pause 1 second, type → 2 undo steps
- [ ] Rapid backspace → 1 undo restores all deleted chars
- [ ] Type in Block A, press Enter, type in Block B → 3 undo steps
- [ ] Indent block → 1 undo, cursor stays in block
- [ ] Delete selection → undo restores text + selection highlight
- [ ] Undo then Redo → exact state restoration
- [ ] Ctrl+A escalation → new undo group
- [ ] Format then structural change → 2 undo steps

---

## 9. Why This Matters (The Psychological Effect)

Before Emotional Undo:

- Users type carefully
- Users fear "breaking" something
- Users save mentally

After Emotional Undo:

- Users type faster
- Users experiment freely
- Users trust the editor

**Confidence is the unlock.**

---

## 10. Forbidden Actions (Permanent)

❌ **Never:**

- Guess what the user meant
- Merge unrelated intents for "convenience"
- Skip cursor restoration for "performance"
- Use DOM-based undo (ProseMirror history)
- Let React state own history

✅ **Always:**

- Respect time windows exactly
- Restore full selection state
- Make undo deterministic
- Keep commands pure
- Log grouping decisions (dev mode)

---

**This law is now permanent.** Implementation must obey it exactly.
