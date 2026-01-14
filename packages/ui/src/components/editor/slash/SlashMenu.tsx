/**
 * Slash Menu Component
 *
 * Pure React component for slash command menu.
 * NO editor references, NO hooks tied to ProseMirror.
 * Safe to render/unrender without side effects.
 *
 * Phase 3 - Step 3A: Command list rendering
 * - Filters commands by query
 * - Renders command list
 * - No keyboard handling yet (Step 3B)
 * - No execution yet (Step 3C)
 */

import { useMemo } from 'react';
import { filterCommands, type SlashCommand } from './commands';

export type SlashMenuProps = {
  open: boolean;
  query: string;
  coords: { top: number; left: number } | null;
  selectedIndex?: number; // For keyboard navigation (Step 3B)
  onSelect?: (_commandAction: string) => void; // For click execution (Step 3.1.2)
  onHover?: (_index: number) => void; // For mouse hover (updates selectedIndex)
};

export function SlashMenu({
  open,
  query,
  coords,
  selectedIndex = 0,
  onSelect,
  onHover,
}: SlashMenuProps) {
  if (!open || !coords) return null;

  // Filter commands based on query
  const filteredCommands = useMemo(() => filterCommands(query), [query]);

  // Show "no results" if filtered list is empty
  if (filteredCommands.length === 0) {
    return (
      <div
        onWheel={(e) => {
          // 🎯 CRITICAL: Stop wheel event propagation
          e.stopPropagation();
        }}
        style={{
          position: 'absolute',
          top: coords.top + 8,
          left: coords.left,
          zIndex: 9999,
          minWidth: 220,
          padding: 12,
          borderRadius: 8,
          background: 'var(--background)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          pointerEvents: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        No commands found for "{query}"
      </div>
    );
  }

  return (
    <div
      onMouseDown={(e) => {
        console.log('[SlashMenu] onMouseDown', e.target);
      }}
      onClick={(e) => {
        console.log('[SlashMenu] onClick', e.target);
      }}
      onWheel={(e) => {
        e.stopPropagation();
      }}
      style={{
        position: 'absolute', // ✅ Coordinates are editor-relative (normalized from viewport)
        top: coords.top + 8, // Small offset below cursor
        left: coords.left,
        zIndex: 9999, // ✅ Above everything (BlockSelectionHalo is 81)
        minWidth: 240,
        maxHeight: 320,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: 4,
        borderRadius: 8,
        background: 'var(--background)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        pointerEvents: 'auto',
      }}
    >
      {filteredCommands.map((cmd, index) => (
        <SlashMenuItem
          key={cmd.id}
          command={cmd}
          index={index}
          isSelected={index === selectedIndex}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </div>
  );
}

/**
 * Individual slash menu item
 */
function SlashMenuItem({
  command,
  index,
  isSelected,
  onSelect,
  onHover,
}: {
  command: SlashCommand;
  index: number;
  isSelected: boolean;
  onSelect?: (_commandAction: string) => void;
  onHover?: (_index: number) => void;
}) {
  return (
    <div
      onClick={() => {
        console.log('[SlashMenuItem] onClick', command.label);
        onSelect?.(command.action);
      }}
      onMouseDown={(e) => {
        console.log('[SlashMenuItem] onMouseDown', command.label);
        e.preventDefault();
      }}
      onMouseEnter={() => {
        onHover?.(index);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isSelected
          ? 'var(--hover-bg, rgba(0, 0, 0, 0.05))'
          : 'transparent',
        transition: 'background 100ms ease',
      }}
    >
      {/* Icon */}
      {command.icon && (
        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
            opacity: 0.8,
          }}
        >
          {command.icon}
        </div>
      )}

      {/* Label & Description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: 2,
          }}
        >
          {command.label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            opacity: 0.7,
          }}
        >
          {command.description}
        </div>
      </div>
    </div>
  );
}
