import { atom } from 'nanostores';
import { PluginMessageType } from '@/types/types';

// Initialize theme from URL parameters
const getInitialTheme = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get('theme');
  return (themeParam === 'dark' || themeParam === 'light') ? themeParam : 'light';
};

// Create the penpot theme atom
export const $penpotTheme = atom(getInitialTheme());

// Listen for theme change messages from Penpot app
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  if (type === PluginMessageType.THEME_CHANGE && payload?.theme) {
    $penpotTheme.set(payload.theme);
  }
});

