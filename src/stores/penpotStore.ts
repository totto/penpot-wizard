import { create } from 'zustand';
import { Theme, PluginToAppMessage } from '../types';

interface PenpotStore {
  penpotTheme: Theme;
  setPenpotTheme: (theme: Theme) => void;
}

// Initialize theme from URL parameters
const getInitialTheme = (): Theme => {
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get('theme');
  return (themeParam === 'dark' || themeParam === 'light') ? themeParam : 'light';
};

export const usePenpotStore = create<PenpotStore>((set) => ({
  penpotTheme: getInitialTheme(),
  setPenpotTheme: (theme) => set({ penpotTheme: theme }),
}));

// Listen for theme change messages from Penpot app
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  if (type === PluginToAppMessage.THEME_CHANGE && payload?.theme) {
    usePenpotStore.getState().setPenpotTheme(payload.theme);
  }
});
