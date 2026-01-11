/**
 * ListBlock - React node view for list items
 *
 * Notion-style structure:
 * - [Marker 24px] [Content flex:1]
 * - Connector via CSS pseudo-element (in padding area)
 * - No ul/ol/li - all divs
 *
 * Features:
 * - L-shaped connectors for nested items (CSS)
 * - Collapse toggle with completion count for tasks with children
 * - Checkbox sync (parent -> children)
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { spacing, sizing, typography } from '../tokens';
import type { ListBlockAttrs } from '../types';
import { useTheme } from '@clutter/ui';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { MarkerContainer } from './BlockWrapper';
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { TaskPriorityIndicator } from './TaskPriorityIndicator';
import { Checkbox } from '@clutter/ui';

// Props are provided by TipTap's ReactNodeViewRenderer
type ListBlockProps = NodeViewProps;

/**
 * Calculate the list number for a numbered list item
 */
function calculateListNumber(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined,
  level: number
): number {
  const pos = getPos();
  if (pos === undefined) return 1;

  let count = 1;
  const doc = editor.state.doc;

  doc.nodesBetween(0, pos, (node, nodePos) => {
    if (nodePos >= pos) return false;

    if (node.type.name === 'listBlock') {
      const attrs = node.attrs as ListBlockAttrs;
      if (attrs.listType === 'numbered' && attrs.level === level) {
        count++;
      }
      // Reset on non-numbered lists or lower level lists
      if (attrs.listType !== 'numbered' || attrs.level < level) {
        count = 1;
      }
    } else if (
      node.type.name === 'paragraph' ||
      node.type.name === 'heading' ||
      node.type.name === 'blockquote' ||
      node.type.name === 'callout' ||
      node.type.name === 'codeBlock' ||
      node.type.name === 'toggleHeader' ||
      node.type.name === 'horizontalRule'
    ) {
      // Reset count when any other block type interrupts the numbered list
      count = 1;
    }

    return true;
  });

  return count;
}

/**
 * Get children info for a task (tasks at level+1 that follow this task)
 */
function getChildrenInfo(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined
): { total: number; completed: number; hasChildren: boolean } {
  const pos = getPos();
  if (pos === undefined) return { total: 0, completed: 0, hasChildren: false };

  const doc = editor.state.doc;
  const currentNode = doc.nodeAt(pos);
  if (!currentNode) return { total: 0, completed: 0, hasChildren: false };

  const currentBlockId = currentNode.attrs.blockId;
  if (!currentBlockId) return { total: 0, completed: 0, hasChildren: false };

  let total = 0;
  let completed = 0;

  // Count children by parentBlockId (explicit parent-child relationship)
  doc.descendants((node) => {
    if (node.type.name === 'listBlock') {
      const attrs = node.attrs as ListBlockAttrs;

      // Only count tasks that are direct children (parentBlockId matches our blockId)
      if (attrs.parentBlockId === currentBlockId && attrs.listType === 'task') {
        total++;
        if (attrs.checked) {
          completed++;
        }
      }
    }
    return true;
  });

  return { total, completed, hasChildren: total > 0 };
}

/**
 * Check if a toggle has children (any blocks with this toggle as parent)
 */
function toggleHasChildren(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined
): boolean {
  const pos = getPos();
  if (pos === undefined) return false;

  const doc = editor.state.doc;
  const currentNode = doc.nodeAt(pos);
  if (!currentNode) return false;

  const currentBlockId = currentNode.attrs.blockId;
  if (!currentBlockId) return false;

  let hasChildren = false;

  // Check if any block has this as parent
  doc.descendants((node) => {
    if (
      node.type.name === 'listBlock' ||
      node.type.name === 'paragraph' ||
      node.type.name === 'heading'
    ) {
      if (node.attrs.parentBlockId === currentBlockId) {
        hasChildren = true;
        return false; // Stop searching
      }
    }
    return true;
  });

  return hasChildren;
}

/**
 * Count hidden children (STEP 4: Collapsed children counter)
 *
 * Returns the number of direct children of a collapsed block.
 * This is purely derived state for visual affordance.
 */
function countHiddenChildren(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined
): number {
  const pos = getPos();
  if (pos === undefined) return 0;

  const doc = editor.state.doc;
  const currentNode = doc.nodeAt(pos);
  if (!currentNode) return 0;

  const currentBlockId = currentNode.attrs.blockId;
  if (!currentBlockId) return 0;

  let count = 0;

  // Count all blocks that have this as their parent
  doc.descendants((node) => {
    if (node.attrs?.parentBlockId === currentBlockId) {
      count++;
    }
    return true; // Continue traversal
  });

  return count;
}

/**
 * Check if this task is a child of its parent task (Notion-style)
 * Parent does NOT need to be the immediate previous sibling.
 * We only require that the parent task appears somewhere above.
 */
function isChildOfPreviousTask(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined
): boolean {
  const pos = getPos();
  if (pos === undefined) return false;

  const doc = editor.state.doc;
  const currentNode = doc.nodeAt(pos);
  if (!currentNode) return false;

  const parentBlockId = currentNode.attrs.parentBlockId;
  if (!parentBlockId) return false;

  let foundParent = false;

  // Walk backwards through the document to find the parent task
  doc.nodesBetween(0, pos, (node, nodePos) => {
    if (nodePos >= pos) return false;

    if (node.type.name === 'listBlock') {
      const attrs = node.attrs as ListBlockAttrs;

      if (attrs.listType === 'task' && attrs.blockId === parentBlockId) {
        foundParent = true;
        return false; // Stop once parent is found
      }
    }

    return true;
  });

  return foundParent;
}

/**
 * Update all children's checked state
 */
function updateChildrenChecked(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined,
  checked: boolean
): void {
  const pos = getPos();
  if (pos === undefined) return;

  const { state } = editor;
  const currentNode = state.doc.nodeAt(pos);
  if (!currentNode) return;

  const currentBlockId = currentNode.attrs.blockId;
  if (!currentBlockId) return;

  const { tr } = state;
  const updates: { pos: number; attrs: ListBlockAttrs }[] = [];

  // Recursively update all descendants by parentBlockId
  const updateDescendants = (parentId: string) => {
    state.doc.descendants((node, nodePos) => {
      if (node.type.name === 'listBlock') {
        const attrs = node.attrs as ListBlockAttrs;

        // If this node's parent matches, update it and recurse
        if (attrs.parentBlockId === parentId && attrs.listType === 'task') {
          updates.push({ pos: nodePos, attrs: { ...attrs, checked } });
          // Recursively update this node's children
          if (attrs.blockId) {
            updateDescendants(attrs.blockId);
          }
        }
      }
      return true;
    });
  };

  // Start recursion from current block's ID
  updateDescendants(currentBlockId);

  // Apply all updates in reverse order (to maintain positions)
  for (let i = updates.length - 1; i >= 0; i--) {
    const update = updates[i]!;
    tr.setNodeMarkup(update.pos, undefined, update.attrs);
  }

  if (updates.length > 0) {
    editor.view.dispatch(tr);
  }
}

export function ListBlock({
  node,
  editor,
  getPos,
  updateAttributes,
}: ListBlockProps) {
  const { colors } = useTheme();
  const attrs = node.attrs as ListBlockAttrs;
  const { listType, checked, collapsed, priority, indent } = attrs;

  // Check if this block is selected
  const isSelected = useBlockSelection({
    editor,
    getPos,
    nodeSize: node.nodeSize,
  });

  // Force re-render when document updates (for reactive children info)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      // Trigger re-render on any document change
      forceUpdate((prev) => prev + 1);
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate); // Re-render on selection change for placeholder focus detection
    editor.on('focus', handleUpdate);
    editor.on('blur', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  // Calculate list number for numbered lists
  const listNumber = useMemo(() => {
    if (listType !== 'numbered') return 0;
    return calculateListNumber(editor, getPos, blockIndent);
  }, [editor, getPos, listType, blockIndent, editor.state.doc]);

  // Get children info for tasks
  const childrenInfo = useMemo(() => {
    if (listType !== 'task')
      return { total: 0, completed: 0, hasChildren: false };
    return getChildrenInfo(editor, getPos);
  }, [editor, getPos, listType, editor.state.doc]);

  // Check if toggle has children
  const toggleHasChildrenFlag = useMemo(() => {
    if (listType !== 'toggle') return false;
    return toggleHasChildren(editor, getPos);
  }, [editor, getPos, listType, editor.state.doc]);

  // Canonical emptiness check (ProseMirror source of truth)
  const isEmpty = node.content.size === 0;

  // Placeholder text (includes focus detection via usePlaceholder)
  const placeholderText = usePlaceholder({ node, editor, getPos });

  // Get priority level from attribute (set when user types ! and presses space)
  const committedPriority = priority || 0;

  // Detect uncommitted priority from text content (preview as user types)
  const textContent = node.textContent || '';
  const exclamationMatches = textContent.match(/!+/g);
  const previewPriority = exclamationMatches
    ? Math.min(Math.max(...exclamationMatches.map((m) => m.length)), 3)
    : 0;

  // Check if this task is a child of the previous task (for showing connectors)
  const showConnector = useMemo(() => {
    if (listType !== 'task') return false;
    return isChildOfPreviousTask(editor, getPos);
  }, [listType, editor, getPos, editor.state.doc]);

  // Handle checkbox toggle
  const handleCheckboxChange = useCallback(() => {
    const newChecked = !checked;
    updateAttributes({ checked: newChecked });

    // Cascade to all children (both check and uncheck - Notion-style)
    if (childrenInfo.hasChildren) {
      updateChildrenChecked(editor, getPos, newChecked);
    }
  }, [checked, updateAttributes, editor, getPos, childrenInfo.hasChildren]);

  // Handle collapse toggle
  const handleToggleCollapse = useCallback(() => {
    updateAttributes({ collapsed: !collapsed });
  }, [collapsed, updateAttributes]);

  // Keyboard handler for checkbox (Space/Enter)
  const handleCheckboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleCheckboxChange();
      }
    },
    [handleCheckboxChange]
  );

  // Helper: Convert number to lowercase roman numeral
  const toRomanNumeral = (num: number): string => {
    const romanMap: [number, string][] = [
      [1000, 'm'],
      [900, 'cm'],
      [500, 'd'],
      [400, 'cd'],
      [100, 'c'],
      [90, 'xc'],
      [50, 'l'],
      [40, 'xl'],
      [10, 'x'],
      [9, 'ix'],
      [5, 'v'],
      [4, 'iv'],
      [1, 'i'],
    ];
    let result = '';
    for (const [value, numeral] of romanMap) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  };

  // 🔥 FLAT MODEL: indent is the ONLY structural attribute
  const blockIndent = indent ?? 0;
  const totalIndent = blockIndent * spacing.indent;

  // Calculate display level for marker styling (cycles based on indent)
  const displayLevel = blockIndent;

  // Render the marker content (bullet, number, or checkbox)
  const renderMarkerContent = () => {
    switch (listType) {
      case 'bullet': {
        // Cycle through 3 bullet styles based on display level
        const bulletStyle = displayLevel % 3;

        if (bulletStyle === 0) {
          // Level 0, 3, 6... → • filled circle
          return (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
          );
        } else if (bulletStyle === 1) {
          // Level 1, 4, 7... → ○ hollow circle
          return (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: '1.5px solid currentColor',
                backgroundColor: 'transparent',
              }}
            />
          );
        } else {
          // Level 2, 5, 8... → ■ filled square
          return (
            <span
              style={{
                width: 6,
                height: 6,
                backgroundColor: 'currentColor',
              }}
            />
          );
        }
      }

      case 'numbered': {
        // Cycle through 3 numbering styles based on display level
        const numberStyle = displayLevel % 3;
        let displayNumber: string;

        if (numberStyle === 0) {
          // Level 0, 3, 6... → 1. decimal
          displayNumber = `${listNumber}.`;
        } else if (numberStyle === 1) {
          // Level 1, 4, 7... → a. lowercase letter
          const letterIndex = ((listNumber - 1) % 26) + 1; // Wrap after 'z'
          displayNumber = `${String.fromCharCode(96 + letterIndex)}.`;
        } else {
          // Level 2, 5, 8... → i. lowercase roman
          displayNumber = `${toRomanNumeral(listNumber)}.`;
        }

        return (
          <span
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.body,
              fontWeight: typography.weight.normal,
              color: 'currentColor',
            }}
          >
            {displayNumber}
          </span>
        );
      }

      case 'task': {
        return (
          <Checkbox
            checked={checked || false}
            onChange={handleCheckboxChange}
            onKeyDown={handleCheckboxKeyDown}
            onClick={(e) => {
              // Only remove focus ring on mouse click, not keyboard activation
              if (e.detail !== 0) {
                e.currentTarget.blur();
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${colors.border.focus}`;
              e.currentTarget.style.outlineOffset = '1px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            size={sizing.marker}
          />
        );
      }

      case 'toggle': {
        // Toggle marker: chevron that rotates based on collapsed state
        return (
          <svg
            onClick={handleToggleCollapse}
            width={sizing.marker}
            height={sizing.marker}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              cursor: 'pointer',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        );
      }

      default:
        return null;
    }
  };

  // Render toggle row (below text, for tasks/toggles with children)
  const renderToggleRow = () => {
    // Show for tasks with children OR toggles with children
    const shouldShow =
      (listType === 'task' && childrenInfo.hasChildren) ||
      (listType === 'toggle' && toggleHasChildrenFlag);

    if (!shouldShow) return null;

    // Align with text: marker container (24px) + gap (4px) = 28px
    const toggleMarginLeft = sizing.markerContainer + spacing.inline;

    // STEP 4: Count hidden children for collapsed blocks
    const hiddenCount = collapsed ? countHiddenChildren(editor, getPos) : 0;

    return (
      <div
        onClick={handleToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginLeft: toggleMarginLeft,
          cursor: 'pointer',
          fontSize: 12,
          color: colors.text.tertiary,
          userSelect: 'none',
        }}
      >
        {/* Chevron icon (tasks only - toggles use caret in marker) */}
        {listType === 'task' && (
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
        {/* Completion count (tasks only, shown when expanded) */}
        {listType === 'task' && !collapsed && (
          <span>
            {childrenInfo.completed}/{childrenInfo.total} subtasks
          </span>
        )}
        {/* STEP 4: Hidden children counter (shown when collapsed) */}
        {collapsed && hiddenCount > 0 && (
          <span
            style={{
              fontSize: 11,
              color: colors.text.tertiary,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {hiddenCount} hidden {hiddenCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
    );
  };

  // Content wrapper styles
  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    ...(listType === 'task' && checked
      ? {
          textDecoration: 'line-through',
          color: colors.text.tertiary,
        }
      : {}),
  };

  return (
    <NodeViewWrapper
      data-type="listBlock"
      data-list-type={listType}
      data-indent={blockIndent}
      data-checked={checked}
      data-collapsed={collapsed}
      data-empty={isEmpty ? 'true' : undefined}
      data-placeholder={placeholderText || undefined}
      className="block-handle-wrapper"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: totalIndent,
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
      }}
    >
      {/* Invisible hover bridge - covers gap between handle and content */}
      {/* Applied to ALL blocks (bullet, numbered, task) to keep handle visible when hovering */}
      <div
        style={{
          position: 'absolute',
          left: indent - 32, // Adjust with indentation: cover handle (24px) + gap (8px)
          top: 0,
          width: 32,
          height: '100%',
          pointerEvents: 'auto',
          // Uncomment to visualize: backgroundColor: 'rgba(255,0,0,0.1)',
        }}
      />
      {/* Block handle (⋮⋮) - shows on hover */}
      <BlockHandle editor={editor} getPos={getPos} indent={indent} />

      {/* Main row: marker (24px) + gap (4px) + content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.inline,
        }}
      >
        {/* PHASE 3 REFACTOR: Use shared MarkerContainer component */}
        <div style={{ color: colors.text.tertiary, position: 'relative' }}>
          {/* L-shaped connector for nested task items */}
          {/* Only show when previous sibling is also a task */}
          {showConnector && (
            <div
              style={{
                position: 'absolute',
                // Start at parent's checkbox center: -spacing.indent + markerContainer/2
                left: -spacing.indent + sizing.markerContainer / 2,
                top: 0,
                width: 12,
                height: 16,
                borderLeft: `1px solid ${colors.border.subtle}`,
                borderBottom: `1px solid ${colors.border.subtle}`,
                borderBottomLeftRadius: 4,
                pointerEvents: 'none',
              }}
            />
          )}
          <MarkerContainer>{renderMarkerContent()}</MarkerContainer>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <NodeViewContent as="div" />
        </div>
      </div>

      {/* Priority indicators - outside the block (mirrors handle position) */}
      {listType === 'task' && (
        <TaskPriorityIndicator
          committedPriority={committedPriority}
          previewPriority={previewPriority}
          onDismiss={() => updateAttributes({ priority: 0 })}
        />
      )}

      {/* Toggle row for tasks with children */}
      {renderToggleRow()}

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
