import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
} from '../types/types';

import { handleDrawShape, handleCreateComponent, handleCreateGroup, handleModifyShape, handleDeleteShape } from './drawHandlers';
import { handleGetProjectData, handleGetUserData, handleAddImage, getCurrentPage } from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 700,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme) => {
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

penpot.ui.onMessage(async (message) => {
  const { type, messageId, payload, source } = message;

  let responseMessage;

  if (source !== MessageSourceName.Client) {
    return;
  }

  if (!messageId) {
    responseMessage = {
      source: MessageSourceName.Plugin,
      type,
      messageId,
      success: false,
      message: 'Missing messageId in client request',
      payload: {
        error: 'messageId is required to correlate async responses',
      },
    };
    penpot.ui.sendMessage(responseMessage);
    return;
  }

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responseMessage = handleDrawShape(payload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responseMessage = await handleAddImage(payload);
      break;

    case ClientQueryType.CREATE_COMPONENT:
      responseMessage = handleCreateComponent(payload);
      break;

    case ClientQueryType.CREATE_GROUP:
      responseMessage = handleCreateGroup(payload);
      break;

    case ClientQueryType.MODIFY_SHAPE:
      responseMessage = handleModifyShape(payload);
      break;

    case ClientQueryType.DELETE_SHAPE:
      responseMessage = handleDeleteShape(payload);
      break;

    case ClientQueryType.GET_USER_DATA:
      responseMessage = handleGetUserData();
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responseMessage = handleGetProjectData();
      break;

    case ClientQueryType.GET_CURRENT_PAGE:
      console.log('<PLUGIN>getCurrentPage');
      responseMessage = getCurrentPage();
      console.log('<PLUGIN>getCurrentPage response', responseMessage);
      break;

    default:
      responseMessage = {
        success: false,
        message: `unknown command: ${type}`,
        payload: {
          error: `Unknown command: ${type}`,
        },
      };
      break;
  }
  const normalizedResponse = {
    source: MessageSourceName.Plugin,
    type,
    messageId,
    ...(responseMessage || {}),
  };

  if (!normalizedResponse.payload || typeof normalizedResponse.payload !== 'object') {
    normalizedResponse.payload = {};
  }

  penpot.ui.sendMessage(normalizedResponse);
});

