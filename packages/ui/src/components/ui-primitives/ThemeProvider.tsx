import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { mode, colors } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme colors as CSS variables
    root.style.setProperty('--color-bg-default', colors.background.default);
    root.style.setProperty('--color-bg-secondary', colors.background.secondary);
    root.style.setProperty('--color-bg-tertiary', colors.background.tertiary);
    root.style.setProperty('--color-bg-hover', colors.background.hover);
    root.style.setProperty('--color-bg-active', colors.background.active);
    
    root.style.setProperty('--color-text-default', colors.text.default);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-tertiary', colors.text.tertiary);
    root.style.setProperty('--color-text-disabled', colors.text.disabled);
    root.style.setProperty('--color-text-placeholder', colors.text.placeholder);
    root.style.setProperty('--color-text-inverse', colors.text.inverse);
    
    root.style.setProperty('--color-border-default', colors.border.default);
    root.style.setProperty('--color-border-hover', colors.border.hover);
    root.style.setProperty('--color-border-focus', colors.border.focus);
    root.style.setProperty('--color-border-divider', colors.border.divider);
    
    // Set data attribute for theme
    root.setAttribute('data-theme', mode);
  }, [mode, colors]);

  return <>{children}</>;
};

