/**
 * Slash Menu Component
 *
 * Pure React component for slash command menu.
 * NO editor references, NO hooks tied to ProseMirror.
 * Safe to render/unrender without side effects.
 *
 * Phase 3 - Step 2: Read-only UI rendering
 * - Shows query
 * - Positions near cursor
 * - No keyboard handling yet
 * - No insertion yet
 */

import React from 'react';

export type SlashMenuProps = {
  open: boolean;
  query: string;
  coords: { top: number; left: number } | null;
};

export function SlashMenu({ open, query, coords }: SlashMenuProps) {
  if (!open || !coords) return null;

  return (
    <div
      style={{
        position: 'absolute', // ✅ CRITICAL: Coordinates are editor-relative (normalized from viewport)
        top: coords.top + 8, // Small offset below cursor
        left: coords.left,
        zIndex: 1000,
        minWidth: 220,
        padding: 8,
        borderRadius: 8,
        background: 'var(--background)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.6,
          marginBottom: 6,
        }}
      >
        Slash command
      </div>

      <div style={{ fontSize: 14 }}>
        Query: <strong>{query || '(empty)'}</strong>
      </div>
    </div>
  );
}
