'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent Hydration mismatch errors by ensuring component is fully mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10" />; // Empty spacer placeholder during initial load

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2.5 rounded-xl border transition-all duration-300 bg-gray-900 border-gray-800 dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-800 dark:hover:bg-gray-800 text-gray-200 focus:outline-none shadow-md"
      aria-label="Toggle Light/Dark Theme"
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-yellow-400 fill-yellow-400/20 animate-fade-in" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20 animate-fade-in" />
      )}
    </button>
  );
}