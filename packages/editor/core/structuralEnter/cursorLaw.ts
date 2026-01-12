// packages/editor/core/structuralEnter/cursorLaw.ts

import type {
  EnterContext,
  StructuralEnterResult,
} from './types';

/**
 * STRUCTURAL ENTER LAW
 *
 * This function decides WHAT Enter means.
 * It does NOT mutate anything.
 * 
 * 🔒 CHILD-FIRST INSERTION LAW:
 * If the current block supports children, insertion prefers creating a child.
 * Siblings are only created when explicitly exiting the block.
 * 
 * Priority order (THIS ORDER MATTERS):
 * 1. Empty block → Exit (create sibling below)
 * 2. Block can have children → Create child (hierarchy-preserving)
 * 3. Cursor at start → Create sibling above
 * 4. Cursor at end → Create sibling below
 * 5. Cursor in middle → Split block
 */
export function resolveStructuralEnter(
  context: EnterContext
): StructuralEnterResult {
  const { isEmpty, atStart, atEnd, canHaveChildren } = context;

  // 🔒 RULE 1: Empty block → EXIT (create sibling below)
  // This is an explicit exit signal from the user
  if (isEmpty) {
    return {
      intent: { kind: 'create-sibling-below' },
      cursor: {
        block: 'created',
        placement: 'start',
      },
    };
  }

  // 🔒 RULE 2: CHILD-FIRST PREFERENCE (hierarchy-preserving)
  // If block can have children (toggle, etc.), pressing Enter creates a child
  // This maintains the mental model: "I'm still inside this container"
  if (canHaveChildren) {
    return {
      intent: { kind: 'create-child' },
      cursor: {
        block: 'created',
        placement: 'start',
      },
    };
  }

  // 🔒 RULE 3: Cursor at start → create sibling ABOVE
  // User wants to insert something before the current block
  if (atStart) {
    return {
      intent: { kind: 'create-sibling-above' },
      cursor: {
        block: 'created',
        placement: 'start',
      },
    };
  }

  // 🔒 RULE 4: Cursor at end → create sibling BELOW
  // User wants to continue after the current block
  if (atEnd) {
    return {
      intent: { kind: 'create-sibling-below' },
      cursor: {
        block: 'created',
        placement: 'start',
      },
    };
  }

  // 🔒 RULE 5: Cursor in middle → split block
  // User wants to break the current block into two
  return {
    intent: { kind: 'split-block' },
    cursor: {
      block: 'created',
      placement: 'start',
    },
  };
}
