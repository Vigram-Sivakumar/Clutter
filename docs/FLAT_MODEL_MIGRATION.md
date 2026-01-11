# Migration to Flat Indent Model

## Status: IN PROGRESS

This document tracks the migration from parent-pointer tree model to flat indent model.

---

## Phase 1: Core Implementation ✅

- [x] Document principles (`FLAT_INDENT_MODEL.md`)
- [x] Create `FlatIntentResolver` (indent/outdent only)
- [x] Create `flatVisibility.ts` (rendering helpers)

---

## Phase 2: Schema Changes (IN PROGRESS)

### Changes Required

**REMOVE:**

- `parentBlockId` attribute from ALL schemas
- `level` attribute from ALL schemas

**ADD:**

- `indent` attribute (number, 0..n)
- `collapsed` attribute (boolean)

### Files to Update

- [ ] `packages/editor/extensions/nodes/Paragraph.ts`
- [ ] `packages/editor/extensions/nodes/Heading.ts`
- [ ] `packages/editor/extensions/nodes/ListBlock.ts`
- [ ] `packages/editor/extensions/nodes/CodeBlock.ts`
- [ ] `packages/editor/extensions/nodes/Blockquote.ts`
- [ ] `packages/editor/extensions/nodes/Callout.ts`
- [ ] `packages/editor/extensions/nodes/HorizontalRule.ts`

---

## Phase 3: Engine Integration

- [ ] Switch `EditorCore` to use `FlatIntentResolver`
- [ ] Remove old `IntentResolver`
- [ ] Remove `subtreeHelpers.ts`
- [ ] Remove `recomputeAllLevels` function
- [ ] Update bridge to NOT rebuild structure

---

## Phase 4: Component Updates

- [ ] Update block components to use `indent` instead of `level`
- [ ] Update CSS for indent rendering
- [ ] Remove parent-pointer dependent logic

---

## Phase 5: Collapse Implementation

- [ ] Implement collapse toggle
- [ ] Use `flatVisibility.getVisibleBlocks()`
- [ ] Update rendering to filter hidden blocks

---

## Phase 6: Testing

- [ ] Progressive indent (Tab × 5)
- [ ] Outdent with children
- [ ] Collapse/expand
- [ ] Multi-block selection
- [ ] Undo/redo

---

## Phase 7: Cleanup

- [ ] Delete `intentResolver.ts`
- [ ] Delete `subtreeHelpers.ts`
- [ ] Delete parent-pointer migration code
- [ ] Remove all parent-related utilities

---

## Critical Decision: Data Migration

**Current data has:**

- `parentBlockId` (string | null)
- `level` (number)

**New data needs:**

- `indent` (number)

**Migration strategy:**

1. On document load, convert `level` → `indent`
2. Ignore `parentBlockId` (no longer used)
3. Old notes will work immediately

**No database migration needed - schema change only.**
