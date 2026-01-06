/**
 * Note Helper Utilities
 * Shared functions for working with note data
 */

/**
 * Check if TipTap JSON content is empty
 * @param content - TipTap JSON string
 * @returns true if content is empty (no actual text/nodes), false otherwise
 */
export const isContentEmpty = (content: string): boolean => {
  try {
    if (!content || content.trim() === '') return true;

    const json = JSON.parse(content);
    // Empty TipTap document: {"type":"doc","content":[{"type":"paragraph"}]} or similar
    if (!json.content || json.content.length === 0) return true;

    // Check if all nodes are empty paragraphs
    return json.content.every((node: any) => {
      if (
        node.type === 'paragraph' &&
        (!node.content || node.content.length === 0)
      ) {
        return true; // This paragraph is empty
      }
      return false; // This node has content or is not a paragraph
    });
  } catch {
    return true; // If parsing fails, consider it empty
  }
};
