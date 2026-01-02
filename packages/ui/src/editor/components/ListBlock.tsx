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
import { useTheme } from '../../hooks/useTheme';
import { sizing as globalSizing } from '../../tokens/sizing';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { MarkerContainer } from './BlockWrapper';
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';
import { TaskPriorityIndicator } from './TaskPriorityIndicator';

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
    } else if (node.type.name === 'paragraph' || node.type.name === 'heading' || 
               node.type.name === 'blockquote' || node.type.name === 'callout' || 
               node.type.name === 'codeBlock' || node.type.name === 'toggleHeader' ||
               node.type.name === 'horizontalRule') {
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

      if (
        attrs.listType === 'task' &&
        attrs.blockId === parentBlockId
      ) {
        foundParent = true;
        return false; // Stop once parent is found
      }
    }

    return true;
  });

  return foundParent;
}

/**
 * Check if this item should be hidden (child of collapsed parent)
 * Uses explicit parentBlockId relationships
 */
function isHiddenByCollapsedParent(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined
): boolean {
  const pos = getPos();
  if (pos === undefined) return false;

  const doc = editor.state.doc;
  const currentNode = doc.nodeAt(pos);
  if (!currentNode) return false;
  
  let currentParentId = currentNode.attrs.parentBlockId;
  
  // Walk up the parent chain checking for collapsed ancestors
  while (currentParentId) {
    let foundParent = false;
    let parentCollapsed = false;
    
    doc.descendants((node) => {
    if (node.type.name === 'listBlock') {
      const attrs = node.attrs as ListBlockAttrs;
      
        // Found the parent
        if (attrs.blockId === currentParentId) {
          foundParent = true;
          
          // Check if it's a collapsed task
          if (attrs.listType === 'task' && attrs.collapsed) {
            parentCollapsed = true;
            return false; // Stop searching
          }
          
          // Move up to next parent
          currentParentId = attrs.parentBlockId;
          return false; // Stop this iteration
      }
    }
    return true;
  });
  
    if (parentCollapsed) {
      return true; // Found collapsed ancestor
    }
    
    if (!foundParent) {
      break; // No more parents
    }
  }
  
  return false;
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
  const { listType, level, checked, collapsed, parentToggleId, priority } = attrs;
  
  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });
  
  // Force re-render when document updates (for reactive children info)
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => {
      // Trigger re-render on any document change
      forceUpdate(prev => prev + 1);
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
    return calculateListNumber(editor, getPos, level);
  }, [editor, getPos, listType, level, editor.state.doc]);

  // Get children info for tasks
  const childrenInfo = useMemo(() => {
    if (listType !== 'task') return { total: 0, completed: 0, hasChildren: false };
    return getChildrenInfo(editor, getPos);
  }, [editor, getPos, listType, editor.state.doc]);

  // Check if this item should be hidden (child of collapsed parent task OR toggle)
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined) return false;
    
    // Check if hidden by collapsed task parent
    const hiddenByTask = isHiddenByCollapsedParent(editor, getPos);
    
    // Check if hidden by collapsed toggle parent
    const hiddenByToggle = parentToggleId ? isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId) : false;
    
    return hiddenByTask || hiddenByToggle;
  }, [editor, getPos, level, parentToggleId, editor.state.doc]);

  // Get placeholder text (CSS handles visibility)
  const placeholderText = usePlaceholder({ node, editor, getPos });

  // Get priority level from attribute (set when user types ! and presses space)
  const committedPriority = priority || 0;
  
  // Detect uncommitted priority from text content (preview as user types)
  const textContent = node.textContent || '';
  const exclamationMatches = textContent.match(/!+/g);
  const previewPriority = exclamationMatches 
    ? Math.min(Math.max(...exclamationMatches.map(m => m.length)), 3)
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
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
      [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
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

  // Calculate indent (hierarchy + toggle grouping)
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  // Calculate display level for marker styling
  // If nested under a toggle, subtract 1 so first-level lists under toggle show first-level markers
  const displayLevel = parentToggleId ? Math.max(0, level - 1) : level;

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
        // URL-encode the checkmark color for SVG data URL
        const checkmarkColor = colors.background.default.replace('#', '%23');
        
        return (
          <input
            type="checkbox"
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
            style={{
              width: sizing.marker,
              height: sizing.marker,
              margin: 0,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              border: `1.5px solid ${colors.marker}`,
              borderRadius: globalSizing.radius.md,
              backgroundColor: checked ? colors.text.default : colors.background.default,
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
              outline: 'none',
              // SVG checkmark when checked (dynamic color based on theme)
              backgroundImage: checked
                ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='${checkmarkColor}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E")`
                : 'none',
              backgroundSize: '14px 14px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  // Render toggle row (below text, for tasks with children)
  const renderToggleRow = () => {
    if (listType !== 'task' || !childrenInfo.hasChildren) return null;

    // Align with text: marker container (24px) + gap (4px) = 28px
    const toggleMarginLeft = sizing.markerContainer + spacing.inline;

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
        {/* Chevron icon */}
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
        {/* Completion count */}
        <span>
          {childrenInfo.completed}/{childrenInfo.total} subtasks
        </span>
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
      data-level={level}
      data-checked={checked}
      data-collapsed={collapsed}
      data-parent-toggle-id={parentToggleId}
      data-hidden={isHidden}
      className="block-handle-wrapper"
      style={{
        position: 'relative',
        display: isHidden ? 'none' : 'flex', // Hide if collapsed by parent (task OR toggle)
        flexDirection: 'column',
        paddingLeft: indent,
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.inline }}>
        {/* PHASE 3 REFACTOR: Use shared MarkerContainer component */}
        <div style={{ color: colors.marker, position: 'relative' }}>
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
            borderLeft: `1px solid ${colors.border.divider}`,
            borderBottom: `1px solid ${colors.border.divider}`,
            borderBottomLeftRadius: 4,
            pointerEvents: 'none',
          }}
        />
      )}
          <MarkerContainer>{renderMarkerContent()}</MarkerContainer>
        </div>
        
        {/* Content with placeholder */}
        <div style={{ ...contentStyle, position: 'relative' }}>
          <NodeViewContent 
            as="div"
            data-placeholder={placeholderText || undefined}
          />
          {/* Placeholder now handled by CSS via data-placeholder attribute */}
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

