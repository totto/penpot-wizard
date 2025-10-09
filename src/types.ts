/**
 * Message types for communication between Penpot plugin and app
 */

// Enum for messages sent from the plugin to the Penpot app
export enum PluginToAppMessage {
  THEME_CHANGE = 'THEME_CHANGE',
  // Add other message types as needed
}

// Enum for messages sent from the Penpot app to the plugin
export enum AppToPluginMessage {
  // Add other message types as needed
}

// Theme type definition
export type Theme = 'light' | 'dark';
