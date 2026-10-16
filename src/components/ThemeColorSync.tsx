import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// Matches --background in index.css so the mobile browser bar blends with the app
const THEME_COLORS = { light: '#f7f7f7', dark: '#121212' } as const;

const ThemeColorSync = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && resolvedTheme) {
      meta.setAttribute('content', THEME_COLORS[resolvedTheme === 'dark' ? 'dark' : 'light']);
    }
  }, [resolvedTheme]);

  return null;
};

export default ThemeColorSync;
