import React, { ReactNode } from 'react';
import { ChevronRight } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';
import { spacing } from '../../../../tokens/spacing';
import { useTheme } from '../../../../hooks/useTheme';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  maxWidth?: string;
  isCurrentPage?: boolean; // Special styling for the last item
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: ReactNode; // Default is ChevronRight
}

export const Breadcrumbs = ({ 
  items,
  separator,
}: BreadcrumbsProps) => {
  const { colors } = useTheme();

  const defaultSeparator = <ChevronRight size={sizing.icon.sm} style={{ flexShrink: 0 }} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing['4'], minWidth: 0 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCurrentPage = item.isCurrentPage !== undefined ? item.isCurrentPage : isLast;
        
        // Determine color: current page is more prominent, clickable items are subtle
        const textColor = isCurrentPage ? colors.text.secondary : colors.text.tertiary;
        const separatorColor = colors.text.tertiary;

        return (
          <React.Fragment key={index}>
            {/* Separator before item (except first) */}
            {index > 0 && (
              <div style={{ color: separatorColor, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {separator || defaultSeparator}
              </div>
            )}
            
            {/* Breadcrumb item */}
            <span 
              style={{ 
                fontSize: '14px', 
                color: textColor,
                maxWidth: item.maxWidth || '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: item.onClick ? 'pointer' : 'default',
                transition: 'color 0.15s',
              }}
              onClick={item.onClick}
              onMouseEnter={(e) => item.onClick && (e.currentTarget.style.color = colors.text.default)}
              onMouseLeave={(e) => item.onClick && (e.currentTarget.style.color = textColor)}
            >
              {item.label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

