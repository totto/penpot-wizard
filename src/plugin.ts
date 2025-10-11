import { PluginToAppMessage } from '@/types';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 450,
  height: 750,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme) => {
  console.log('Theme changed to:', newTheme);
  
  // Send message to the app about theme change
  penpot.ui.sendMessage({
    type: PluginToAppMessage.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

