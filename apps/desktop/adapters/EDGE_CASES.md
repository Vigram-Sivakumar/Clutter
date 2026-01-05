# Edge Cases for Adapter Implementation

This document captures schema reality discovered during validation (Option B).
These edge cases inform adapter implementation but do NOT change the EditorDocument contract.

---

## Note.content Edge Cases

### Current Storage Format
- **Type**: `string` (stringified JSON)
- **Structure**: TipTap JSON format
- **Example**: `'{"type":"doc","content":[{"type":"paragraph"}]}'`

### Edge Cases to Handle

#### 1. Empty Notes (New/Uninitialized)
- **Value**: `content: ''` (empty string)
- **Frequency**: Every new note starts this way
- **Adapter behavior**: Convert to default EditorDocument with empty paragraph

#### 2. Malformed JSON
- **Value**: Invalid JSON string (corrupted, partial)
- **Frequency**: Rare, but possible from crashes or sync issues
- **Adapter behavior**: Fall back to empty document, log error

#### 3. Empty TipTap Document
- **Value**: `'{"type":"doc","content":[]}'` or `'{"type":"doc","content":[{"type":"paragraph"}]}'`
- **Frequency**: Common for notes with no content
- **Adapter behavior**: Valid EditorDocument (no special handling)

#### 4. Missing Block IDs (Legacy)
- **Issue**: Older notes may not have `attrs.id` on blocks
- **Frequency**: Unknown (depends on when BlockIdGenerator was added)
- **Adapter behavior**: Let editor's BlockIdGenerator add IDs on first load

#### 5. Version Field
- **Current**: Note.content does NOT have a version field yet
- **Required**: EditorDocument requires `{ version: number, content: TipTapJSON }`
- **Adapter behavior**: Wrap existing content with `version: 1` on load

---

## Tag → EditorTag Projection

### Domain Tag Structure
```typescript
{
  name: string;           // Primary key (case-preserved)
  description: string;
  descriptionVisible: boolean;
  isFavorite: boolean;
  color?: string;         // Optional
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### Edge Cases to Handle

#### 1. Tag.name as ID
- **Issue**: Tag uses `name` as primary key, not separate `id` field
- **EditorTag needs**: `id: string`
- **Adapter behavior**: Use `tag.name` (case-preserved) as `id`
- **Alternative**: Use `tag.name.toLowerCase()` for consistency with store lookups

#### 2. Optional Color
- **Issue**: `color` is optional in domain, optional in EditorTag
- **Adapter behavior**: Pass through as-is (undefined → undefined)

#### 3. Deleted Tags
- **Issue**: Tags with `deletedAt !== null` exist in metadata
- **Adapter behavior**: Filter out deleted tags before projection (don't show in editor)

---

## Note → EditorLinkedNote Projection

### Domain Note/NoteMetadata Structure
```typescript
{
  id: string;      // Always present (generated)
  title: string;   // Always present (may be empty: '')
  // ...other fields not needed
}
```

### Edge Cases to Handle

#### 1. Empty Title
- **Value**: `title: ''` (empty string)
- **Frequency**: Common for new/draft notes
- **EditorLinkedNote needs**: `title: string`
- **Adapter behavior**: Pass through empty string (display as "Untitled" in UI, not adapter)

#### 2. Deleted Notes
- **Issue**: Notes with `deletedAt !== null` exist
- **Adapter behavior**: Filter out deleted notes before projection (don't show in autocomplete)

---

## SerializedEditorDocument → Note.content

### Reverse Conversion Edge Cases

#### 1. Version Stripping
- **Input**: `{ version: 1, content: {...} }`
- **Output**: `JSON.stringify(content)` (without version wrapper)
- **Why**: Current persistence expects bare TipTap JSON string
- **Future**: May store version with content once migrations are needed

#### 2. Metadata Preservation
- **Input**: Original Note + updated EditorDocument
- **Output**: Merge content, preserve timestamps/metadata
- **Critical**: Don't overwrite `id`, `createdAt`, `folderId`, etc.

---

## Migration Strategy

### Current State (No Version in DB)
- Note.content stores bare TipTap JSON string
- No version field in persistence
- All content implicitly "version 1"

### Adapter Responsibility
- **On load**: Wrap bare JSON with `{ version: 1, content: ... }`
- **On save**: Unwrap and stringify content only (for now)
- **Future**: When schema changes, save version with content

### When to Bump Version
- Breaking changes to TipTap node structure
- New required attributes on blocks
- Changes to mark format
- NOT for new node types (additive changes)

---

## Validation Verdict

✅ **All edge cases can be absorbed by adapters**
✅ **EditorDocument contract remains unchanged**
✅ **No circular dependencies**
✅ **Migration path is clear**

The adapters are shock absorbers. The editor stays pristine.

Ready for Phase 2 implementation.

