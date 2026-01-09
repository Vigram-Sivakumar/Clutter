/**
 * Callout - React node view for callout boxes
 *
 * PHASE 3 REFACTOR: Uses shared hooks and components.
 * Styled callout boxes for info, warning, error, success messages.
 * Uses the editor token system and patterns.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Info, AlertTriangle, XCircle, CheckCircle } from '@clutter/ui';
import { typography, spacing } from '../tokens';
import { useTheme } from '@clutter/ui';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';

type CalloutType = 'info' | 'warning' | 'error' | 'success';

const getCalloutStyles = (
  type: CalloutType,
  colors: ReturnType<typeof useTheme>['colors']
) => {
  const styles = {
    info: {
      borderColor: colors.semantic.info + '75',
      backgroundColor: colors.semantic.info + '08',
      iconColor: colors.semantic.info,
      iconBackground: colors.semantic.info + '15',
    },
    warning: {
      borderColor: colors.semantic.warning + '75',
      backgroundColor: colors.semantic.warning + '08',
      iconColor: colors.semantic.warning,
      iconBackground: colors.semantic.warning + '15',
    },
    error: {
      borderColor: colors.semantic.error + '75',
      backgroundColor: colors.semantic.error + '08',
      iconColor: colors.semantic.error,
      iconBackground: colors.semantic.error + '15',
    },
    success: {
      borderColor: colors.semantic.success + '75',
      backgroundColor: colors.semantic.success + '08',
      iconColor: colors.semantic.success,
      iconBackground: colors.semantic.success + '15',
    },
  };
  return styles[type] || styles.info;
};

const getIcon = (type: CalloutType, color: string, size: number) => {
  const iconProps = {
    size,
    color,
    style: { flexShrink: 0 } as React.CSSProperties,
  };

  switch (type) {
    case 'info':
      return <Info {...iconProps} />;
    case 'warning':
      return <AlertTriangle {...iconProps} />;
    case 'error':
      return <XCircle {...iconProps} />;
    case 'success':
      return <CheckCircle {...iconProps} />;
    default:
      return <Info {...iconProps} />;
  }
};

export function Callout({ node, editor, getPos }: NodeViewProps) {
  const { colors } = useTheme();
  const type = (node.attrs.type as CalloutType) || 'info';
  const styles = getCalloutStyles(type, colors);
  const parentToggleId = node.attrs.parentToggleId || null;
  const level = node.attrs.level || 0;

  // Canonical emptiness check (ProseMirror source of truth)
  const isEmpty = node.content.size === 0;

  // Check if this block is selected
  const isSelected = useBlockSelection({
    editor,
    getPos,
    nodeSize: node.nodeSize,
  });

  // Placeholder text (includes focus detection via usePlaceholder)
  const placeholderText = usePlaceholder({ node, editor, getPos });

  // Force re-render when document updates (to react to parent toggle collapse)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
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

  // Check if this callout should be hidden by a collapsed toggle
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined || !parentToggleId) return false;
    return isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId);
  }, [editor, editor.state.doc, getPos, parentToggleId]);

  // Calculate indent based on level (hierarchy + toggle grouping)
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  return (
    <NodeViewWrapper
      as="div"
      data-type="callout"
      data-callout-type={type}
      data-parent-toggle-id={parentToggleId}
      data-level={level}
      data-hidden={isHidden}
      data-empty={isEmpty ? 'true' : undefined}
      data-placeholder={placeholderText || undefined}
      className="callout-block"
      style={{
        display: isHidden ? 'none' : 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: spacing['16'],
        backgroundColor: styles.backgroundColor,
        border: `1px solid ${styles.borderColor}`,
        borderRadius: 4,
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
        marginLeft: indent,
      }}
    >
      {/* Icon container - rounded with background */}
      <div
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: styles.iconBackground,
          borderRadius: 4,
          marginTop: '1px',
        }}
      >
        {getIcon(type, styles.iconColor, 14)}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
        <NodeViewContent
          style={{
            color: colors.text.default,
          }}
        />
      </div>

      {/* Block selection halo */}
      <BlockSelectionHalo isSelected={isSelected} indent={indent} />
    </NodeViewWrapper>
  );
}
