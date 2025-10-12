import { atom } from 'nanostores';
import { Theme, PluginToAppMessage, UserData, ProjectData } from '@/types/types';

// Initialize theme from URL parameters
const getInitialTheme = (): Theme => {
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get('theme');
  return (themeParam === 'dark' || themeParam === 'light') ? themeParam : 'light';
};

// Create the penpot theme atom
export const $penpotTheme = atom<Theme>(getInitialTheme());

export const $userData = atom<UserData>({
  name: 'John Doe',
  id: '123',
});

export const $projectData = atom<ProjectData>({
  name: 'Project 1',
  id: '123',
});

// Listen for theme change messages from Penpot app
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  if (type === PluginToAppMessage.THEME_CHANGE && payload?.theme) {
    $penpotTheme.set(payload.theme);
  }
});
