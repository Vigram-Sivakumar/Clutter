# Design System v0.1

**Status:** Active  
**Last Updated:** January 2026

---

## Philosophy

Clutter's design system follows a **Notion × Apple** hybrid philosophy — combining Notion's calm, content-first aesthetic with Apple's disciplined interaction patterns.

### Core Principles

1. **Color ≠ Hierarchy**  
   Hierarchy is established through layout, typography, spacing, and emphasis. Color only supports hierarchy.

2. **Interaction Uses Delta, Not New Colors**  
   Hover and active states use opacity changes, luminance shifts, or overlays — not brand-new colors.

3. **Surfaces Are Boring (On Purpose)**  
   The calmer your surfaces, the more premium the UI feels. Accents are rare and meaningful.

4. **Components Own Behavior, Tokens Define Meaning**  
   The color system defines *what* something is. Components define *how* it behaves.

---

## Token Architecture

The system has three layers:

```
Palette (raw material)
    ↓
Semantic Tokens (meaning)
    ↓
Component Behavior (interaction)
```

### Layer 1: Palette

Raw color values (never use directly in components):

- **Light Mode:** `stone[]` — minimal editorial aesthetic
- **Dark Mode:** `neutral[]` — Notion-inspired dark theme

### Layer 2: Semantic Tokens

Components only talk to semantic tokens:

```typescript
background.*
text.*
border.*
overlay.*
accent.*
semantic.*
button.*
```

**Location:** `/packages/ui/src/tokens/colors.ts`

### Layer 3: Component Behavior

Components own how they respond to interaction:

- Buttons compute hover using `darken()` utility
- Surfaces use global `background.hover`
- Overlays stack on transparent backgrounds

---

## Interaction States

### Surfaces (Lists, Rows, Cards)

Used by: sidebar items, table rows, cards, editor blocks

**Rule:**
```
background.default → background.hover → background.active
```

**Light Mode:**
- Hover: subtle darkening (3-6%)
- Active: slightly more (8-10%)

**Dark Mode:**
- Hover: slight lift (lighter, not darker)
- Active: settle back (mimics physical elevation)

**Reference Implementation:** `SidebarItem.tsx`

---

### Primary Actions (Buttons)

Used by: "Save", "Create", "Submit"

**Rule:**
- Hover = darken 6%
- Active = darken 6% + slight inset (motion, not color)

**Implementation:**
```typescript
onHover: darken(colors.button.primary.background, 0.06)
```

**Utility:** `/packages/ui/src/utils/colorUtils.ts`

---

### Secondary Actions (Buttons)

Used by: "Cancel", "Duplicate", "Move"

**Rule:**
- Hover = `overlay.light`
- Active = `overlay.medium`

Feels neutral, not demanding.

---

### Tertiary / Ghost Actions (Icon Buttons)

Used by: icon buttons, inline actions, overflow menus

**Rule:**
```
transparent → overlay.light (hover) → overlay.medium (active)
```

**Critical:** Text color NEVER changes on hover. Only background overlay.

**Reference Implementation:** `Button.tsx` (variant="tertiary")

---

### Disabled State

**Never "grey everything".**

Correct pattern:
- Text → `colors.text.disabled`
- Background → unchanged
- Cursor → `not-allowed`
- Opacity → subtle (0.85) or none

Disabled elements should feel inactive, not broken.

---

## Component Usage Table

| Component | Background | Hover | Active | Text |
|-----------|------------|-------|--------|------|
| Sidebar row | `bg.default` | `bg.hover` | `bg.active` | `text.default` |
| List item | `bg.default` | `bg.hover` | `bg.active` | `text.default` |
| Card | `bg.secondary` | `bg.hover` | — | `text.default` |
| Primary button | `button.primary.bg` | `darken(6%)` | `darken(6%)` + motion | `button.primary.text` |
| Secondary button | `bg.secondary` | `overlay.light` | `overlay.medium` | `text.default` |
| Ghost button | `transparent` | `overlay.light` | `overlay.medium` | `text.secondary` |
| Icon button | `transparent` | `overlay.light` | `overlay.medium` | `text.tertiary` |

---

## Accent Colors

### When to Use

Accent colors are for:
- ✅ Tags
- ✅ Highlights
- ✅ Status indicators
- ✅ Selection (in editor)
- ✅ Calendar markers

### When NOT to Use

Accent colors are NOT for:
- ❌ Hover states
- ❌ Default borders
- ❌ Dividers
- ❌ Random emphasis

**Rule:** If removing the accent does not reduce meaning, it shouldn't be there.

---

## Semantic Colors

Use semantic colors for:
- **Success:** `colors.semantic.success`
- **Warning:** `colors.semantic.warning`
- **Error:** `colors.semantic.error`
- **Info:** `colors.semantic.info`

Never use accent colors for error/warning states.

**Example:**
```typescript
// ❌ BAD
color: isDanger ? colors.accent.red.text : colors.text.secondary

// ✅ GOOD
color: isDanger ? colors.semantic.error : colors.text.secondary
```

---

## Dark Mode Specific Rule

**Hover direction is inverted:**

- **Light mode:** Hover darker, active darkest
- **Dark mode:** Hover lighter, active darker

This mimics physical elevation and makes the UI feel "alive" (Notion's approach).

---

## Reference Implementations

These components demonstrate canonical patterns:

1. **`SidebarItem.tsx`** — Interactive rows  
   Hover: `background.hover`  
   Active: `background.active`  
   Disabled: `text.disabled`

2. **`Button.tsx`** — All button variants  
   Primary: computed darken  
   Tertiary: overlay-based hover/active

3. **`Tag.tsx`** — Correct accent usage  
   Accents only for semantic meaning (tag colors)

---

## Do / Don't

### ✅ DO

- Use one hover token for all surfaces
- Derive action hover behavior in components
- Keep accents rare and meaningful
- Prefer overlays over new colors
- Let text color stay semantic
- Use `cursor: not-allowed` for disabled states

### ❌ DON'T

- Add `primaryHover` / `secondaryHover` tokens
- Use accent colors for interaction states
- Encode hierarchy via hover color
- Let components invent new colors
- Change text color on tertiary button hover
- Mix hover patterns within the same component type

---

## Color Utilities

**Location:** `/packages/ui/src/utils/colorUtils.ts`

**Available Functions:**
- `darken(color, amount)` — Darkens hex color by percentage
- `lighten(color, amount)` — Lightens hex color by percentage

**Usage:**
```typescript
import { darken } from '../../utils/colorUtils';

// In button hover handler
target.style.backgroundColor = darken(colors.button.primary.background, 0.06);
```

**Note:** Only add utilities when there's a clear semantic use case.

---

## Known Issues / Future Work

### Token Naming Mismatch

The design philosophy references:
- `overlay.soft` (hover)
- `overlay.default` (active)
- `overlay.strong` (emphasis)

But `colors.ts` currently has:
- `overlay.light`
- `overlay.medium`
- `overlay.heavy`

**Status:** Using current names with inline comments. Will rename in future update.

---

## Migration Guide

### For New Components

1. Use only semantic tokens from `colors.ts`
2. Follow the component usage table above
3. Reference `SidebarItem.tsx` or `Button.tsx` for interaction patterns
4. Never invent new colors inline

### For Existing Components

1. Audit current color usage
2. Replace hardcoded hex values with semantic tokens
3. Replace undefined tokens (like `colors.button.primary.hover`)
4. Ensure tertiary buttons only change background on hover, not text

---

## Questions?

For design system questions or proposals, reference:
- This document (philosophy and rules)
- `/packages/ui/src/tokens/colors.ts` (token definitions)
- `/packages/ui/src/components/app-layout/layout/sidebar/items/SidebarItem.tsx` (reference implementation)

---

**Last Updated:** January 2026  
**Version:** 0.1  
**Status:** Active

