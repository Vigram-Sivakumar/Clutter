# ParagraphBlock Interaction Contract - AUDIT REPORT

**Status**: ⚠️ VIOLATIONS FOUND  
**Date**: Phase 2.2 - Block Interaction Contract Enforcement  
**Auditor**: System Review against Canonical Contract

---

## 0. Core Invariants

| Invariant                                | Status  | Notes                            |
| ---------------------------------------- | ------- | -------------------------------- |
| Paragraph is always selectable           | ✅ PASS | PM/TipTap handles                |
| Paragraph always has exactly one blockId | ✅ PASS | Lines 56-64 enforce              |
| Paragraph never auto-converts            | ✅ PASS | No auto-conversion logic         |
| Paragraph can exist empty                | ✅ PASS | content: 'inline\*' allows empty |
| Paragraph can be first/last/only         | ✅ PASS | No restrictions                  |

---

## A. Cursor & Selection Behavior

### A1. Arrow Keys (← / →)

| Scenario       | Expected                    | Implementation     | Status         |
| -------------- | --------------------------- | ------------------ | -------------- |
| Middle of text | Move char by char           | PM default         | ⚠️ UNKNOWN     |
| Start + ←      | Move to end of prev block   | handleArrowLeft()  | ⚠️ NEEDS AUDIT |
| End + →        | Move to start of next block | handleArrowRight() | ⚠️ NEEDS AUDIT |
| No prev/next   | Cursor stays                | ?                  | ⚠️ NEEDS AUDIT |

**Action Required**: Audit `handleArrowLeft/Right` implementations

---

### A2. Up / Down Arrow (↑ / ↓)

| Scenario        | Expected              | Implementation        | Status         |
| --------------- | --------------------- | --------------------- | -------------- |
| Single-line     | Move to nearest block | handleArrowUp/Down()  | ⚠️ NEEDS AUDIT |
| Multi-line      | Move visually         | PM default + handlers | ⚠️ NEEDS AUDIT |
| Preserve offset | Best effort           | ?                     | ⚠️ NEEDS AUDIT |

**Action Required**: Audit `handleArrowUp/Down` implementations

---

### A3. Ctrl+A / Cmd+A (Selection Escalation)

| Press Count | Expected            | Implementation        | Status      |
| ----------- | ------------------- | --------------------- | ----------- |
| 1st         | Select text inside  | SelectAll.ts (global) | ✅ VERIFIED |
| 2nd         | Select entire block | SelectAll.ts (global) | ✅ VERIFIED |
| 3rd         | Select entire doc   | SelectAll.ts (global) | ✅ VERIFIED |

**VERIFIED**: Selection escalation FULLY IMPLEMENTED globally  
**Location**: `/packages/editor/plugins/SelectAll.ts` (lines 168-192)  
**Registration**: EditorCore.tsx line 171  
**Contract Compliance**: ✅ EXACT MATCH (Text → Block → Document)  
**Action Required**: NONE - Paragraph does not need to handle this

---

### A4. Click vs Keyboard Focus

**Status**: ⚠️ ASSUMED PM DEFAULT  
**Action Required**: Verify ProseMirror handles this correctly

---

### A5. Multi-Line Cursor Movement

**Status**: ✅ PASS (PM default handles line-by-line movement)

---

## B. Structural Operations

### B1. Enter Key (Lines 162-284)

| Cursor State   | Expected       | Implementation   | Status       |
| -------------- | -------------- | ---------------- | ------------ |
| Middle of text | Split into two | ✅ Lines 260-283 | ✅ PASS      |
| Start          | Insert above   | ❌ NOT EXPLICIT  | ❌ VIOLATION |
| End            | Insert below   | ✅ Lines 260-283 | ✅ PASS      |
| Empty          | Insert below   | ✅ Lines 260-283 | ✅ PASS      |

**VIOLATIONS FOUND**:

1. **❌ CRITICAL - Too Much Complexity (Lines 162-284)**
   - Hashtag detection (lines 232-256)
   - Toggle handling (lines 189-229)
   - Wrapper block checks (lines 175-187)
   - Multiple early returns

   **Contract Says**: "Enter always creates exactly one new ParagraphBlock"  
   **Reality**: Enter has 5+ different code paths with different behaviors

   **Severity**: MEDIUM - Works but violates single responsibility

2. **❌ Enter at Start Behavior Not Explicit**
   - Contract: "Insert new paragraph above"
   - Implementation: Uses PM default `splitBlock()` which inserts below

   **Severity**: LOW - Behavior might be correct but not explicit

3. **⚠️ blockId Generation**
   - Lines 219, 272, 308: Manual `crypto.randomUUID()` calls
   - Contract: "New paragraph gets new blockId" ✅
   - BUT: Should this be centralized in BlockIdGenerator?

   **Severity**: LOW - Works but could be more consistent

**Recommendations**:

- Move hashtag detection to a separate rule
- Move toggle handling to toggle-specific rules
- Simplify Paragraph Enter to pure split behavior
- Make "insert above" vs "insert below" explicit

---

### B2. Backspace Key (Lines 324-374)

| Cursor State       | Expected            | Implementation            | Status      |
| ------------------ | ------------------- | ------------------------- | ----------- |
| Middle of text     | Delete character    | PM default (return false) | ⚠️ IMPLICIT |
| End of text        | Delete character    | PM default (return false) | ⚠️ IMPLICIT |
| Start of non-empty | Merge with previous | PM default (return false) | ⚠️ IMPLICIT |
| Empty paragraph    | Remove this block   | Lines 328-373             | ✅ PASS     |

**VIOLATIONS FOUND**:

1. **⚠️ Relies on PM Default for Core Cases**
   - Lines 328-329: Early return `false` for non-empty
   - Contract expects explicit handling of ALL cases
   - PM default might be correct, but it's implicit

   **Severity**: LOW - Works but not explicitly documented

2. **❌ Merge Behavior Not Explicit**
   - Contract: "Merge with previous block" at start of non-empty
   - Implementation: Returns false, lets PM handle
   - Is PM merge behavior correct? Unknown.

   **Severity**: MEDIUM - Core contract behavior not verified

3. **✅ Empty Paragraph Deletion**
   - Lines 340-369: Explicit deletion
   - Handles structural block edge case
   - Correct blockId destruction

**Recommendations**:

- Make merge behavior explicit
- Document why PM default is correct (if it is)
- Add explicit handling for start-of-non-empty case

---

### B3. Delete Key (Forward Delete)

| Cursor State     | Expected         | Implementation | Status       |
| ---------------- | ---------------- | -------------- | ------------ |
| Middle of text   | Delete character | ?              | ❌ NOT FOUND |
| End of paragraph | Merge with next  | ?              | ❌ NOT FOUND |
| Empty paragraph  | Remove block     | ?              | ❌ NOT FOUND |

**VIOLATION**: Delete key behavior NOT IMPLEMENTED  
**Severity**: HIGH - Core contract requirement missing  
**Contract Says**: "Symmetric with Backspace, directionally consistent"

**Action Required**: Implement Delete key handler symmetric to Backspace

---

### B4. Tab / Shift+Tab (Lines 151-153)

**Status**: ✅ PASS  
**Implementation**: Centrally handled via keyboard rules (Phase 2.1)  
**Comment**: Explicit note that node extensions must not handle structural keyboard logic

---

## C. Block Identity Guarantees

### C1. Preserves blockId

| Action          | Expected | Implementation    | Status          |
| --------------- | -------- | ----------------- | --------------- |
| Typing          | Preserve | PM default        | ✅ ASSUMED      |
| Deleting text   | Preserve | PM default        | ✅ ASSUMED      |
| Cursor movement | Preserve | PM default        | ✅ ASSUMED      |
| Indent/outdent  | Preserve | Engine-controlled | ✅ PASS         |
| Moving block    | Preserve | Engine-controlled | ✅ PASS         |
| Undo/redo       | Restore  | PM history        | ⚠️ NEEDS VERIFY |

---

### C2. Creates new blockId

| Action                | Expected     | Implementation       | Status          |
| --------------------- | ------------ | -------------------- | --------------- |
| Enter (new paragraph) | New blockId  | Lines 219, 272, 308  | ✅ PASS         |
| Paste multiple        | New blockIds | ?                    | ⚠️ NEEDS VERIFY |
| Explicit creation     | New blockId  | Line 308 (Cmd+Enter) | ✅ PASS         |

**Note**: Manual `crypto.randomUUID()` calls - should verify consistency

---

### C3. Destroys blockId

| Action                | Expected        | Implementation         | Status       |
| --------------------- | --------------- | ---------------------- | ------------ |
| Backspace on empty    | Destroy         | Line 351 (delete node) | ✅ PASS      |
| Merge into previous   | Destroy current | PM default?            | ⚠️ IMPLICIT  |
| Delete removing block | Destroy         | NOT IMPLEMENTED        | ❌ VIOLATION |

---

### C4. Undo / Redo

**Status**: ⚠️ ASSUMED PM HISTORY  
**Action Required**: Verify undo/redo restores blockId correctly

---

## D. Edge Cases

### D1. First Paragraph in Document

| Action             | Expected         | Implementation                     | Status       |
| ------------------ | ---------------- | ---------------------------------- | ------------ |
| Backspace at start | noop             | Lines 340-369 check for structural | ⚠️ PARTIAL   |
| Delete at start    | Delete char only | NOT IMPLEMENTED                    | ❌ VIOLATION |
| Enter at start     | Insert above     | splitBlock inserts below?          | ⚠️ WRONG?    |

**Issue**: First paragraph edge case not explicitly handled

---

### D2. Last Paragraph in Document

| Action        | Expected     | Implementation  | Status       |
| ------------- | ------------ | --------------- | ------------ |
| Delete at end | noop         | NOT IMPLEMENTED | ❌ VIOLATION |
| Enter at end  | Insert below | ✅ splitBlock   | ✅ PASS      |

---

### D3. Only Paragraph in Document

| Action               | Expected        | Implementation              | Status       |
| -------------------- | --------------- | --------------------------- | ------------ |
| Backspace at start   | noop            | ⚠️ Checks structural before | ⚠️ UNCLEAR   |
| Backspace when empty | noop (≥1 block) | Lines 351 deletes           | ❌ VIOLATION |
| Enter                | Creates second  | ✅ splitBlock               | ✅ PASS      |

**CRITICAL VIOLATION**: Empty paragraph can be deleted even if it's the only block  
**Contract**: "Document must have ≥1 block"  
**Line 351**: Unconditionally deletes empty paragraph

---

### D4. Paragraph After Structural Block

| Action             | Expected            | Implementation   | Status         |
| ------------------ | ------------------- | ---------------- | -------------- |
| Backspace at start | Merge if allowed    | Lines 340-369    | ✅ PASS        |
| Enter at start     | New paragraph above | splitBlock?      | ⚠️ UNCLEAR     |
| Arrow Up           | Move into previous  | handleArrowUp?   | ⚠️ NEEDS AUDIT |
| Arrow Down         | Move into next      | handleArrowDown? | ⚠️ NEEDS AUDIT |

**Good**: Lines 338-369 explicitly handle structural block before paragraph

---

## E. Forbidden Behaviors

| Forbidden Behavior        | Found? | Location  | Status  |
| ------------------------- | ------ | --------- | ------- |
| Auto-convert paragraph    | ❌ NO  | -         | ✅ PASS |
| Insert tabs/spaces on Tab | ❌ NO  | -         | ✅ PASS |
| Lose blockId on edit      | ❌ NO  | -         | ✅ PASS |
| Multiple blocks on Enter  | ❌ NO  | -         | ✅ PASS |
| Browser default keys      | ❌ NO  | Phase 2.1 | ✅ PASS |
| Silent fallback           | ❌ NO  | Phase 2.1 | ✅ PASS |

---

## SUMMARY - Critical Issues

### ✅ HIGH SEVERITY (ALL RESOLVED)

1. **Document Must Have ≥1 Block** - ✅ FIXED
   - Added guard in Backspace handler
   - `blockCount <= 1` → noop
   - Document invariant enforced

2. **Delete Key Not Implemented** - ✅ FIXED
   - Implemented Delete handler (lines 391-526)
   - Symmetric to Backspace, directionally consistent
   - All edge cases explicitly handled

3. **Ctrl+A Selection Escalation** - ✅ VERIFIED
   - Globally implemented in SelectAll.ts
   - Contract compliant (Text → Block → Document)
   - No Paragraph-level action needed

### 🟡 MEDIUM SEVERITY (Should Fix)

4. **Enter Key Too Complex**
   - Multiple responsibilities in one handler
   - Violates single responsibility principle

5. **Backspace Merge Not Explicit**
   - Relies on PM default
   - Behavior not verified against contract

6. **Enter at Start Behavior Unclear**
   - Contract: insert above
   - Implementation: unclear if correct

### 🟢 LOW SEVERITY (Nice to Fix)

7. **blockId Generation Not Centralized**
   - Manual UUID calls instead of using BlockIdGenerator
   - Works but inconsistent

8. **Arrow Key Handlers Need Audit**
   - Delegated to separate functions
   - Behavior not verified

---

## NEXT ACTIONS (Priority Order)

### ✅ CRITICAL FIXES COMPLETE (Phase 2.2.2)

1. ✅ **Fix "only paragraph" deletion** - DONE (Fix #1)
2. ✅ **Implement Delete key** - DONE (Fix #2)
3. ✅ **Verify Ctrl+A escalation** - VERIFIED (exists globally)

### ⏭️ DEFERRED (Future Phases)

4. ⚠️ **Audit arrow key handlers** (`handleArrowLeft/Right/Up/Down`)
5. ⚠️ **Simplify Enter handler** (move hashtag/toggle to rules)
6. ⚠️ **Make Backspace merge explicit**
7. ⚠️ **Verify undo/redo blockId preservation**

---

**Phase 2.2.2 Complete. All critical violations resolved.**  
**Status**: Ready for next phase.
