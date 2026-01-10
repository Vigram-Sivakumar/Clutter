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
      {/* TOGGLE HEADER - Inline content only */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.inline,
        }}
      >
        {/* Chevron button */}
        <button
          contentEditable={false}
          onClick={() => updateAttributes({ collapsed: !collapsed })}
          style={{
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

        {/* Header inline content (title text) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <NodeViewContent as="div" />
        </div>
      </div>

      {/* TOGGLE CONTENT - Real children live here */}
      {!collapsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.block,
            paddingLeft: sizing.markerContainer + spacing.inline,
            marginTop: spacing.block,
          }}
        >
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
}
