import { ReactNode, CSSProperties } from 'react';

interface DragRegionProps {
  /**
   * Content to render inside the drag region
   */
  children: ReactNode;
  
  /**
   * Padding values for the container (in px)
   * The drag overlay will extend into these padding areas
   */
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  
  /**
   * Additional styles for the container
   */
  containerStyle?: CSSProperties;
  
  /**
   * Additional styles for the content layer
   */
  contentStyle?: CSSProperties;
  
  /**
   * Only show drag region in Tauri (native app)
   * Default: true
   */
  tauriOnly?: boolean;
}

/**
 * DragRegion Component
 * 
 * A reusable component that creates a draggable window region using the absolute overlay pattern.
 * 
 * Structure:
 * - Container (position: relative, with padding)
 * - Drag overlay (absolute, extends into padding areas, behind content)
 * - Content layer (relative, above overlay, also draggable)
 * 
 * Usage:
 * ```tsx
 * <DragRegion padding={{ left: 12, right: 12 }}>
 *   <div style={{ WebkitAppRegion: 'no-drag' }}>
 *     <button>Not draggable</button>
 *   </div>
 *   <div>Draggable content</div>
 * </DragRegion>
 * ```
 */
export const DragRegion = ({
  children,
  padding = {},
  containerStyle = {},
  contentStyle = {},
  tauriOnly = true,
}: DragRegionProps) => {
  // Check if running in Tauri (native app)
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  
  // Only render drag region if not Tauri-only or if in Tauri
  const shouldRenderDragRegion = !tauriOnly || isTauri;
  
  const {
    top = 0,
    right = 0,
    bottom = 0,
    left = 0,
  } = padding;

  return (
    <div
      style={{
        position: 'relative',
        ...containerStyle,
      }}
    >
      {/* ✅ Drag overlay (absolute, behind content) - extends into padding */}
      {shouldRenderDragRegion && (
        <div
          data-tauri-drag-region
          style={{
            position: 'absolute',
            top: -top,
            right: -right,
            bottom: -bottom,
            left: -left,
            zIndex: 0,
            userSelect: 'none',
          } as any}
        />
      )}

      {/* Content layer (sits above drag region) - also draggable */}
      <div
        data-tauri-drag-region={shouldRenderDragRegion ? true : undefined}
        style={{
          position: 'relative',
          zIndex: 1,
          ...contentStyle,
        } as any}
      >
        {children}
      </div>
    </div>
  );
};

