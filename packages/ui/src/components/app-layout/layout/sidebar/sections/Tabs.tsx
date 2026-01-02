import { ReactNode } from 'react';
import { SegmentedControl } from '../../../../ui-primitives';

interface SidebarTabOption {
  value: string;
  icon: ReactNode;
  label?: string;
}

interface SidebarTabsProps {
  value: string;
  onChange: (value: string) => void;
  options: SidebarTabOption[];
  size?: 'small' | 'medium';
}

export const SidebarTabs = ({
  value,
  onChange,
  options,
  size = 'medium',
}: SidebarTabsProps) => {
  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      size={size}
    />
  );
};

