# Keyboard Rules Migration Map

This document maps existing detection functions in `keyboardRules.ts` to the new rule-based architecture.

## Current Structure

```
keyboardRules.ts (484 lines)
├── EnterRules (18 detection functions)
└── BackspaceRules (11 detection functions)
```

## Target Structure

```
plugins/keyboard/
├── rules/
│   ├── enter/
│   │   ├── exitEmptyParagraph.ts
│   │   ├── outdentEmptyList.ts
│   │   ├── exitWrapper.ts
│   │   └── ...
│   └── backspace/
│       ├── deleteEmptyParagraph.ts
│       ├── mergeWithPrevious.ts
│       ├── outdentList.ts
│       └── ...
└── keymaps/
    ├── enter.ts (aggregates Enter rules)
    └── backspace.ts (aggregates Backspace rules)
```

---

## Enter Rules Mapping

### 1. **exitEmptyParagraph**
- **Old:** `EnterRules.isInEmptyParagraph()` + `getEmptyParagraphWrapperContext()`
- **When:** Cursor in empty paragraph (optionally inside wrapper)
- **Do:** Convert to paragraph or exit wrapper

### 2. **outdentEmptyList**
- **Old:** `EnterRules.getEmptyListBlockContext()` + `shouldExitWrapperFromEmptyList()`
- **When:** Empty list block
- **Do:** Outdent or convert to paragraph

### 3. **exitHeading**
- **Old:** `EnterRules.getHeadingContext()`
- **When:** At end of heading
- **Do:** Create new paragraph below

### 4. **exitWrapper**
- **Old:** `EnterRules.getWrapperBlockContext()`
- **When:** Empty block inside blockquote/callout
- **Do:** Exit wrapper

---

## Backspace Rules Mapping

### 1. **deleteEmptyParagraph** (FIRST TO MIGRATE)
- **Old:** `BackspaceRules.isInEmptyParagraphAtStart()`
- **When:** Cursor at start of empty paragraph
- **Do:** Delete paragraph, merge with previous

### 2. **mergeWithPrevious**
- **Old:** `BackspaceRules.isAtStartOfParagraph()` + `getStructuralBlockBefore()`
- **When:** At start of paragraph with structural block before
- **Do:** Prevent default or custom merge

### 3. **outdentList**
- **Old:** `BackspaceRules.getEmptyListBlockBackspaceContext()`
- **When:** Empty list block at start
- **Do:** Outdent or convert to paragraph

### 4. **exitWrapper**
- **Old:** `BackspaceRules.getWrapperBlockBackspaceContext()`
- **When:** At start of empty block in wrapper
- **Do:** Convert wrapper to paragraph

---

## Migration Strategy

1. ✅ **Phase 1:** Create architecture (Context, Rule, Engine)
2. 🔄 **Phase 2:** Extract ONE rule as proof-of-concept
   - Choose: `deleteEmptyParagraph` (simplest)
   - Verify it works end-to-end
3. **Phase 3:** Migrate remaining rules (mechanical)
4. **Phase 4:** Update node extensions to use rules
5. **Phase 5:** Remove old `keyboardRules.ts`

---

## Helper Functions to Keep

Some functions are pure utilities and should stay:

- `findAncestorNode()` (in keyboardHelpers.ts)
- Block type checks
- Position calculations

These will be used BY rules, not migrated into them.

