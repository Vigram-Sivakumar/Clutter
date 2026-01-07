/**
 * Color manipulation utilities
 * Minimal implementation for button hover states
 */

/**
 * Darken a hex color by a given amount
 * @param color - Hex color string (e.g., '#RRGGBB')
 * @param amount - Amount to darken (0-1, where 0.1 = 10% darker)
 * @returns Darkened hex color
 */
export function darken(color: string, amount: number): string {
  // Handle rgba colors - return as-is for now
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    return color;
  }

  // Remove # if present
  const hex = color.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Darken by reducing each channel
  const newR = Math.max(0, Math.round(r * (1 - amount)));
  const newG = Math.max(0, Math.round(g * (1 - amount)));
  const newB = Math.max(0, Math.round(b * (1 - amount)));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Lighten a hex color by a given amount
 * @param color - Hex color string (e.g., '#RRGGBB')
 * @param amount - Amount to lighten (0-1, where 0.1 = 10% lighter)
 * @returns Lightened hex color
 */
export function lighten(color: string, amount: number): string {
  // Handle rgba colors - return as-is for now
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    return color;
  }

  // Remove # if present
  const hex = color.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighten by moving toward white (255)
  const newR = Math.min(255, Math.round(r + (255 - r) * amount));
  const newG = Math.min(255, Math.round(g + (255 - g) * amount));
  const newB = Math.min(255, Math.round(b + (255 - b) * amount));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

