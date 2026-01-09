# Editor Engine - The Headless Core

**This is the spine of the editor.**

Everything else hangs off this.

## What This Is

A pure TypeScript state machine for editor documents.

- **No React** - Just JavaScript classes and functions
- **No TipTap** - Editor agnostic (TipTap is the view layer)
- **No async** - Deterministic state transitions
- **No side effects** - Pure command pattern

## Architecture

```
User Action (click, keypress)
    ↓
Intent (what user wants)
    ↓
IntentResolver (how to fulfill it)
    ↓
Command (reversible state change)
    ↓
EditorEngine (state machine)
    ↓
React Re-renders
```

## The 7 Core Files

### 1. `types.ts` - The Truth

- `BlockTree` - Document structure (normalized)
- `EditorSelection` - What is highlighted (text | block | none)
- `EditorFocus` - Who receives input
- `EditorCursor` - Where text will go
- `InteractionMode` - The ONE thing happening now

### 2. `intent.ts` - Human Desires

- `EditorIntent` - "User wants to delete backward"
- Not implementation, just intention
- 40+ intent types covering all editor actions

### 3. `command.ts` - State Changes

- `EditorCommand` - Reversible mutations
- Every command knows how to apply AND undo itself
- This is how real undo works (not DOM-based)

### 4. `mode.ts` - Conflict Prevention

- `ModeManager` - Only ONE mode at a time
- Eliminates handler conflicts
- Explicit mode transitions (logged, reversible)

### 5. `EditorEngine.ts` - The Brain

- Holds all state (tree, selection, focus, cursor, mode)
- Dispatches commands
- Manages history (undo/redo stack)
- Notifies listeners

### 6. `intentResolver.ts` - UX Logic

- Translates intent → command
- Checks mode before allowing
- This is where Apple-level UX lives
- Single source of behavioral truth

### 7. `index.ts` - Public API

- Exports everything needed externally
- Type-safe imports

## Why This Exists

### Before (chaos):

```typescript
// In 12 different handlers:
editor.chain().deleteNode().run();
```

Problems:

- Can't reason about state
- Can't debug UX bugs
- Can't prevent conflicts
- Can't undo reliably
- Edge cases multiply

### After (authority):

```typescript
// Handler emits intent:
const intent = { type: 'delete-backward', blockId };

// Resolver decides how:
resolver.resolve(intent);

// Command executes:
engine.dispatch(new DeleteBlockCommand(blockId));

// History works:
engine.undo(); // Just works
```

Benefits:

- State changes are intentional
- UX logic is centralized
- Modes prevent conflicts
- Undo is structural
- Edge cases can't hide

## Usage Example

```typescript
import { EditorEngine, IntentResolver } from './engine';

// Create engine
const engine = new EditorEngine();

// Create resolver
const resolver = new IntentResolver(engine);

// Listen to changes
engine.onChange((engine) => {
  console.log('Selection:', engine.selection);
  console.log('Mode:', engine.getMode());
});

// Emit intent
const result = resolver.resolve({
  type: 'insert-text',
  blockId: 'block-1',
  text: 'Hello',
});

if (result.success) {
  console.log('Text inserted!');
}

// Undo
engine.undo();
```

## Integration with TipTap

The engine is **headless** - it doesn't know about TipTap.

TipTap becomes a **view layer**:

- Renders engine.tree
- Captures events
- Emits intents
- Listens to engine changes

This is how Apple Notes / Craft / Notion architecture works.

## Next Steps

1. ✅ **Engine skeleton installed** (this commit)
2. Connect to existing KeyboardEngine (emit intents, not commands)
3. Sync with TipTap (bidirectional)
4. Refactor handlers to use intents
5. Add IME safety
6. Add accessibility

## The Apple Difference

**Most editors**: React state → handlers mutate → hope for the best

**This editor**: Engine truth → intents → commands → React renders

React doesn't control state.  
React **reflects** state.

That's the difference between "working" and "inevitable."
