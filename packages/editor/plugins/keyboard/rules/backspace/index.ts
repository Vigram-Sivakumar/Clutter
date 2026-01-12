/**
 * Backspace Key Rules
 *
 * All rules for Backspace key behavior.
 * Exported in priority order (highest first).
 */

export * from './normalizeEmptyBlock'; // Priority 110 - UNIVERSAL: empty non-paragraph → paragraph
export * from './outdentEmptyList'; // Priority 105 - empty list → paragraph (specific)
export * from './deleteEmptyParagraph'; // Priority 100
export * from './backspaceSkipHiddenBlocks'; // Priority 95 - STEP 3: skip collapsed subtrees
export * from './exitEmptyWrapper'; // Priority 80
export * from './mergeWithStructuralBlock'; // Priority 70
