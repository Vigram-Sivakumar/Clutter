/**
 * EditorLinkedNote - Editor-specific note link projection
 * 
 * This is NOT a domain Note. It is a lightweight projection
 * that contains only what the editor needs to:
 * - Render note links
 * - Autocomplete @mentions
 * - Show note titles
 * 
 * The app adapts domain Notes → EditorLinkedNotes at the boundary.
 * The editor never imports domain types.
 */

/**
 * EditorLinkedNote - What the editor knows about linked notes
 * 
 * Deliberately minimal. Editor doesn't care about:
 * - Note content
 * - Folder structure
 * - Timestamps or metadata
 * - Permissions or sync state
 */
export interface EditorLinkedNote {
  /** Unique note identifier */
  id: string;
  
  /** Display title for links/autocomplete */
  title: string;
}

