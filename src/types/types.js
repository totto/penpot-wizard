/**
 * Message types for communication between Penpot plugin and app
 */
export const MessageSourceName = {
  Plugin: 'penpotWizardPlugin',
  Client: 'penpotWizardClient',
};

export const PluginMessageType = {
  THEME_CHANGE: 'THEME_CHANGE',
};

// Enum for messages sent from the Penpot app to the plugin
export const ClientQueryType = {
  GET_USER_DATA: 'GET_USER_DATA',
  GET_PROJECT_DATA: 'GET_PROJECT_DATA',
  GET_CURRENT_PAGE: 'GET_CURRENT_PAGE',
  GET_SELECTED_SHAPES: 'GET_SELECTED_SHAPES',
  DRAW_SHAPE: 'DRAW_SHAPE',
  ADD_IMAGE: 'ADD_IMAGE',
  CREATE_COMPONENT: 'CREATE_COMPONENT',
  CREATE_GROUP: 'CREATE_GROUP',
  MODIFY_SHAPE: 'MODIFY_SHAPE',
  ROTATE_SHAPE: 'ROTATE_SHAPE',
  CLONE_SHAPE: 'CLONE_SHAPE',
  DELETE_SHAPE: 'DELETE_SHAPE',
  MODIFY_TEXT_RANGE: 'MODIFY_TEXT_RANGE',
  BRING_TO_FRONT_SHAPE: 'BRING_TO_FRONT_SHAPE',
  BRING_FORWARD_SHAPE: 'BRING_FORWARD_SHAPE',
  SEND_TO_BACK_SHAPE: 'SEND_TO_BACK_SHAPE',
  SEND_BACKWARD_SHAPE: 'SEND_BACKWARD_SHAPE',
};

export const PenpotShapeType = {
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  PATH: 'path',
  TEXT: 'text',
  BOARD: 'board',
  GROUP: 'group',
};

export const ToolResponse = {
  message: '',
  success: true,
  payload: {},
};

// Theme type definition
export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
};

