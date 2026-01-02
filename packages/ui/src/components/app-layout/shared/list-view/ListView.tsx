import { ReactNode, Fragment } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { SectionTitle } from '../section-title';

// Generic list item data
export interface ListItemData {
  id: string;
  [key: string]: any; // Allow flexible data structure
}

export interface ListViewProps<T extends ListItemData = ListItemData> {
  items: T[];
  selectedId?: string | null;
  onItemClick?: (id: string) => void;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  emptyState?: ReactNode;
  title?: string;
  showDividers?: boolean;
}

export function ListView<T extends ListItemData = ListItemData>({
  items,
  selectedId,
  onItemClick,
  renderItem,
  emptyState,
  title,
  showDividers = true,
}: ListViewProps<T>) {
  const { colors } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['4'],
        flex: 1,
      }}
    >
      {/* Section Title */}
      {title && <SectionTitle>{title}</SectionTitle>}
      
      {/* Empty State */}
      {items.length === 0 && emptyState && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: `${spacing['12']} ${spacing['6']}`,
            color: colors.text.tertiary,
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {emptyState}
        </div>
      )}

      {/* Items List */}
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <div
            onClick={() => onItemClick?.(item.id)}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {renderItem(item, selectedId === item.id)}
          </div>
          {showDividers && index < items.length - 1 && (
            <div
              style={{
                height: '1px',
                backgroundColor: colors.border.SubtleDivider,
              }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

