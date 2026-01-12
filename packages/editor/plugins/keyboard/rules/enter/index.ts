/**
 * Enter Key Rules
 *
 * All rules for Enter key behavior.
 * Exported in priority order (highest first).
 * 
 * 🔒 STRUCTURAL ENTER LAW:
 * All Enter operations delegate to performStructuralEnter() - single authority.
 */

export * from './enterOnSelectedBlock'; // Priority 1000 - halo-selected blocks (single or multi)
export * from './enterToggleCreatesChild'; // Priority 120 - toggle creates child
export * from './exitEmptyBlockInToggle'; // Priority 115 - exit nested/toggle blocks first
export * from './exitEmptyListInWrapper'; // Priority 100
export * from './enterSkipHiddenBlocks'; // Priority 95 - STEP 2: skip collapsed subtrees
export * from './outdentEmptyList'; // Priority 90
export * from './exitEmptyList'; // Priority 85 - convert empty list at level 0
export * from './exitEmptyHeading'; // Priority 80
export * from './exitEmptyWrapper'; // Priority 70
export * from './createParagraphAfterHeading'; // Priority 60
export * from './enterEmptyBlockFallback'; // Priority -1000 - GLOBAL FALLBACK (delegates to authority)