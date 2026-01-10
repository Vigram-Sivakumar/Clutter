/**
 * Backspace Key Rules
 *
 * All rules for Backspace key behavior.
 * Exported in priority order (highest first).
 */

export * from './deleteEmptyParagraph'; // Priority 100
export * from './backspaceSkipHiddenBlocks'; // Priority 95 - STEP 3: skip collapsed subtrees
export * from './outdentEmptyList'; // Priority 90
export * from './exitEmptyWrapper'; // Priority 80
export * from './mergeWithStructuralBlock'; // Priority 70
