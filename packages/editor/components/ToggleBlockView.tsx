/**
 * ToggleBlockView - React NodeView for new toggle structure
 *
 * PHASE 1 IMPLEMENTATION - CONTAINER RENDERING
 *
 * This component renders the NEW toggle structure with real hierarchy:
 *   toggleBlock (this component)
 *   ├─ toggleHeaderNew (inline content)
 *   └─ toggleContent (block children)
 *
 * KEY ARCHITECTURAL DIFFERENCE:
 * - Uses TWO NodeViewContent regions (header + content)
 * - Children are INSIDE the toggle (not siblings)
 * - ProseMirror owns cursor and selection
 * - React only renders chrome (chevron, styling)
 *
 * NO KEYBOARD LOGIC HERE:
 * - Enter works naturally (PM default)
 * - Tab adoption works naturally (Engine handles)
 * - Arrow keys respect depth (PM default)
 * - No exitEmptyBlockInToggle hacks needed
 */

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useTheme } from '@clutter/ui';
import { spacing, sizing, typography } from '../tokens';

type ToggleBlockViewProps = NodeViewProps;

export function ToggleBlockView({
  node,
  updateAttributes,
}: ToggleBlockViewProps) {
  const { colors } = useTheme();
  const collapsed = node.attrs.collapsed as boolean;

  return (
    <NodeViewWrapper
      data-type="toggleBlock"
      data-collapsed={collapsed}
      style={{
        position: 'relative',
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
      }}
    >
      {/* Chevron button */}
      <button
        contentEditable={false}
        onClick={() => updateAttributes({ collapsed: !collapsed })}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          cursor: 'pointer',
          userSelect: 'none',
          border: 'none',
          background: 'transparent',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sizing.marker,
          height: sizing.marker,
          borderRadius: 4,
          color: collapsed ? colors.text.tertiary : colors.text.default,
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s ease, color 0.15s ease',
          marginTop: 2,
        }}
      >
        <svg
          width={sizing.marker}
          height={sizing.marker}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content area - ProseMirror renders toggleHeaderNew and toggleContent here */}
      <div
        style={{
          paddingLeft: sizing.markerContainer + spacing.inline,
        }}
      >
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
