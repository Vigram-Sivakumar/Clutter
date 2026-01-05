/**
 * EditorTag - Editor-specific tag projection
 * 
 * This is NOT a domain Tag. It is a lightweight projection
 * that contains only what the editor needs to:
 * - Render tag pills
 * - Autocomplete hashtags
 * - Show tag colors
 * 
 * The app adapts domain Tags → EditorTags at the boundary.
 * The editor never imports domain types.
 */

/**
 * EditorTag - What the editor knows about tags
 * 
 * Deliberately minimal. Editor doesn't care about:
 * - How tags are stored
 * - Whether they're global or per-folder
 * - Whether they sync remotely
 * - Tag hierarchy or metadata
 */
export interface EditorTag {
  /** Unique tag identifier */
  id: string;
  
  /** Display label for autocomplete/pills */
  label: string;
  
  /** Optional color for visual distinction */
  color?: string;
}

