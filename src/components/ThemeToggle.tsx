"use client";

import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="tw-button"
    >
      {theme === 'dark' ? (
        <Sun className="tw-h-5 tw-w-5 tw-text-foreground" />
      ) : (
        <Moon className="tw-h-5 tw-w-5 tw-text-foreground" />
      )}
      <span className="tw-sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;