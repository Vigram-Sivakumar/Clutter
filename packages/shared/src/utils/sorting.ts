/**
 * Sorting utilities for ordering items
 */

/**
 * Sort items by a custom order array
 * Items in the order array appear first, in that order
 * Items not in the order array appear after, in their original order
 */
export function sortByOrder<T extends { id: string }>(
  items: T[],
  orderedIds: string[]
): T[] {
  if (orderedIds.length === 0) {
    // No custom order, return as-is
    return items;
  }
  
  // Create a map for O(1) lookup
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  
  // Sort items: ordered items first (by order), then unordered items
  return [...items].sort((a, b) => {
    const aOrder = orderMap.get(a.id);
    const bOrder = orderMap.get(b.id);
    
    // Both have order - sort by order
    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    
    // Only a has order - a comes first
    if (aOrder !== undefined) return -1;
    
    // Only b has order - b comes first
    if (bOrder !== undefined) return 1;
    
    // Neither has order - maintain original order
    return 0;
  });
}


