/**
 * HorizontalRule - React node view for horizontal rules
 *
 * Uses inline SVG for wavy pattern with theme-aware colors.
 * Both plain and wavy styles use the same divider color from theme.
 * Supports width toggle: full width or 128px centered.
 */

import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { patterns, spacing } from '../tokens';
import { useTheme } from '@clutter/ui';
import { useBlockSelection } from '../hooks/useBlockSelection';
import { FoldHorizontal, UnfoldHorizontal } from '@clutter/ui';
import { sizing } from '@clutter/ui';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { BlockHandle } from './BlockHandle';

interface HorizontalRuleProps extends NodeViewProps {
  // NodeViewProps already includes node, we just need to specify updateAttributes
  updateAttributes: (_attrs: Record<string, any>) => void;
}

// Height for both styles (consistent clickable area)
const HR_HEIGHT = 24;

export function HorizontalRule({
  node,
  editor,
  getPos,
  updateAttributes,
}: HorizontalRuleProps) {
  const { colors } = useTheme();
  const hrStyle = node.attrs.style || 'plain';
  const fullWidth = node.attrs.fullWidth ?? true;
  const colorMode = node.attrs.color || 'default';
  const level = node.attrs.level || 0;
  const parentBlockId = node.attrs.parentBlockId || null;
  const parentToggleId = node.attrs.parentToggleId || null;
  const [isHovered, setIsHovered] = useState(false);

  // Check if this block is selected
  const isSelected = useBlockSelection({
    editor,
    getPos,
    nodeSize: node.nodeSize,
  });

  // Calculate indent based on level and toggle grouping
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  // Toggle between default divider color and accent orange
  const dividerColor =
    colorMode === 'accent' ? colors.semantic.orange : colors.border.divider;

  const handleToggleWidth = () => {
    updateAttributes({ fullWidth: !fullWidth });
  };

  const handleToggleColor = () => {
    updateAttributes({ color: colorMode === 'default' ? 'accent' : 'default' });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-type="horizontalRule"
      data-style={hrStyle}
      data-full-width={fullWidth}
      data-level={level}
      data-parent-block-id={parentBlockId}
      className="block-handle-wrapper"
      style={{
        height: HR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        paddingLeft: indent,
        // No margin - parent uses gap for spacing
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hover bridge - covers gap between handle and content */}
      <div
        style={{
          position: 'absolute',
          left: indent - 32,
          top: 0,
          width: 32,
          height: '100%',
          pointerEvents: 'auto',
        }}
      />

      {/* Block handle (⋮⋮) - shows on hover */}
      <BlockHandle editor={editor} getPos={getPos} indent={indent} />
      {/* HR line container with conditional width */}
      <div
        style={{
          width: fullWidth ? '100%' : '128px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.2s ease',
        }}
      >
        {hrStyle === 'wavy' ? (
          // Wavy pattern using inline SVG with theme color
          <svg
            width="100%"
            height={patterns.wave.height}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <defs>
              <pattern
                id="wavePattern"
                patternUnits="userSpaceOnUse"
                width={patterns.wave.width}
                height={patterns.wave.height}
              >
                <path
                  d={patterns.wave.path}
                  stroke={dividerColor}
                  strokeWidth={patterns.wave.strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height={patterns.wave.height}
              fill="url(#wavePattern)"
            />
          </svg>
        ) : (
          // Plain line
          <div
            style={{
              width: '100%',
              height: 1,
              backgroundColor: dividerColor,
            }}
          />
        )}
      </div>

      {/* Toggle controls - shown on hover */}
      <div
        contentEditable={false}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          transition: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* Button group wrapper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: colors.background.default,
            // border: `1px solid ${colors.border.default}`,
            borderRadius: sizing.radius.sm,
            padding: '0 4px',
            overflow: 'hidden',
          }}
        >
          {/* Width toggle button */}
          <div
            onClick={handleToggleWidth}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              color: colors.text.secondary,
              transition: 'background-color 0.15s ease',
              borderRadius: sizing.radius.sm,
              // borderRight: `1px solid ${colors.border.default}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.background.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {fullWidth ? (
              <FoldHorizontal size={14} />
            ) : (
              <UnfoldHorizontal size={14} />
            )}
          </div>

          {/* Color toggle button */}
          <div
            onClick={handleToggleColor}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              borderRadius: sizing.radius.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.background.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: dividerColor,
                border: `1px solid ${colors.border.default}`,
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      </div>

      {/* Block selection halo */}
      <BlockSelectionHalo isSelected={isSelected} indent={indent} />

      {/* CSS to show handle on hover or when menu is open (but not while typing or in multi-selection) */}
      <style>{`
        .block-handle-wrapper:hover .block-handle:not([data-is-typing="true"]):not([data-in-multi-selection="true"]),
        .block-handle[data-menu-open="true"] {
          opacity: 1 !important;
        }
      `}</style>
    </NodeViewWrapper>
  );
}
