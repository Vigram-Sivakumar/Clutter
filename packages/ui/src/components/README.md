# Reusable UI Components

This directory contains reusable UI components that can be used across all apps (web, desktop, mobile) for consistent design and behavior.

## Component Philosophy

- **Reusable**: Components should be generic enough to be used in multiple contexts
- **Consistent**: All components follow the design system tokens from `@clutter/ui/tokens`
- **Theme-aware**: Components automatically adapt to light/dark mode
- **Type-safe**: Full TypeScript support with proper prop types

## Adding a New Component

1. Create a new component file (e.g., `Button.tsx`)
2. Use design tokens from `@clutter/ui` and theme from `@clutter/shared`
3. Export it from `index.ts`
4. Document usage in component comments

### Example:

```tsx
import { useTheme } from '@clutter/shared';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
}

export const Button = ({ children, onClick }: ButtonProps) => {
  const { colors } = useTheme();
  
  return (
    <button
      onClick={onClick}
      style={{
        color: colors.text.default,
        // ... use design tokens
      }}
    >
      {children}
    </button>
  );
};
```

## Available Components

### TertiaryButton
A subtle button with optional icon support. Used for secondary actions.

```tsx
import { TertiaryButton, Plus } from '@clutter/ui';

<TertiaryButton icon={<Plus size={14} />}>
  Add item
</TertiaryButton>
```

### NoteTitle
An editable title field with placeholder support.

```tsx
import { NoteTitle } from '@clutter/ui';

<NoteTitle placeholder="Untitled" />
```

### NoteActions
Container for action buttons with consistent spacing.

```tsx
import { NoteActions, TertiaryButton } from '@clutter/ui';

<NoteActions>
  <TertiaryButton>Action 1</TertiaryButton>
  <TertiaryButton>Action 2</TertiaryButton>
</NoteActions>
```

## Usage

Import components from `@clutter/ui`:

```tsx
import { TertiaryButton, NoteTitle, NoteActions } from '@clutter/ui';
```

## Benefits

- **Single source of truth**: Update once, affects all apps
- **Consistency**: Same look and feel across platforms
- **Maintainability**: Easier to update and test
- **Scalability**: Easy to add new components

