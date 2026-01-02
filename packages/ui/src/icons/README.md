# Icon Library

This directory contains all icons used across the Clutter Notes application. Icons are built on top of [Phosphor Icons](https://phosphoricons.com/).

## Icon Configuration

The default icon weight is configured in `tokens/icons.ts` and is set to `'regular'`. You can change it globally by updating the `ICON_WEIGHT` constant.

Available weights: `'thin'` | `'light'` | `'regular'` | `'bold'` | `'fill'` | `'duotone'`

## Adding a New Icon

1. Create a new file in this directory (e.g., `IconName.tsx`)
2. Import the icon from `@phosphor-icons/react` and the weight token:

```tsx
import { IconName as PhosphorIconName, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const IconName = (props: IconProps) => {
  return <PhosphorIconName weight={ICON_WEIGHT} {...props} />;
};
```

3. Export it from `index.ts`:

```tsx
export { IconName } from './IconName';
```

4. The icon will be available as `import { IconName } from '@clutter/ui'`

## Usage

```tsx
import { Plus } from '@clutter/ui';

<Plus size={24} color="#000" />
```

## Benefits

- **Centralized**: All icons in one place for easy discovery
- **Consistent**: Same icon library and weight across all apps
- **Maintainable**: Change icon weight globally in one place
- **Type-safe**: Full TypeScript support
- **Flexible**: Phosphor provides 6 different weights for each icon

