/**
 * DropIndicator - Blue guideline showing where item will be inserted
 * Notion/Craft style drop indicator
 */

import { useTheme } from '../../../../../hooks/useTheme';
import { radius } from '../../../../../tokens/radius';

interface DropIndicatorProps {
  position: 'before' | 'after';
  visible: boolean;
  level?: number; // Indentation level (0 = root, 1 = nested once, etc.)
}

export const DropIndicator = ({ position, visible, level = 0 }: DropIndicatorProps) => {
  const { colors } = useTheme();
  
  if (!visible) return null;
  
  // Calculate left padding to match item indentation
  // Same calculation as in the item components
  const MAX_VISUAL_INDENT = 3;
  const paddingLeft = Math.min(level, MAX_VISUAL_INDENT) * 24;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${paddingLeft}px`, // Start at item's indent level
        right: 0,
        height: 2, // 2px thick indicator
        backgroundColor: colors.semantic.info, // Blue indicator (blue in dark mode, dark gray in light mode)
        [position === 'before' ? 'top' : 'bottom']: -2, // Line sits fully in the 2px gap, no shifting
        zIndex: 1000, // High z-index to appear above items
        pointerEvents: 'none',
        borderRadius: radius['3'], // Slightly rounded edges
      }}
    />
  );
};

