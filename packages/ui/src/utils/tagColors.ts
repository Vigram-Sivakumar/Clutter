/**
 * Utility for assigning consistent colors to tags based on their name.
 * Uses a hash function so the same tag always gets the same color.
 */

const ACCENT_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'purple', 'pink', 'red'] as const;

export type AccentColorName = typeof ACCENT_COLORS[number];

/**
 * FNV-1a hash function - provides better color distribution than djb2
 * Based on: http://isthe.com/chongo/tech/comp/fnv/
 * This ensures tags get more varied colors across the spectrum
 */
function hashString(str: string): number {
  const FNV_PRIME = 0x01000193;
  const FNV_OFFSET_BASIS = 0x811c9dc5;
  
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  
  return Math.abs(hash);
}

/**
 * Color cache to avoid recalculating hashes
 * Map: tag name (lowercase) -> color name
 */
const colorCache = new Map<string, AccentColorName>();

/**
 * Get a consistent accent color name for a tag based on its name
 * Results are memoized for performance
 */
export function getTagColor(tagName: string): AccentColorName {
  const key = tagName.toLowerCase();
  
  // Check cache first
  const cached = colorCache.get(key);
  if (cached) {
    return cached;
  }
  
  // Calculate and cache
  const color = ACCENT_COLORS[hashString(tagName) % ACCENT_COLORS.length];
  colorCache.set(key, color);
  
  return color;
}

/**
 * Clear the color cache (useful for testing or if memory is a concern)
 */
export function clearTagColorCache(): void {
  colorCache.clear();
}
