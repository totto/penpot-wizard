import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
  PenpotShapeType,
} from '../types/types';

import { handleDrawShape, handleCreateComponent, handleCreateGroup, handleModifyShape, handleDeleteShape } from './drawHandlers';
import { handleGetProjectData, handleGetUserData, handleAddImage, getCurrentPage } from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 700,
});

const board = handleDrawShape({
  shapeType: PenpotShapeType.BOARD,
  params: {
    x: 100,
    y: 100,
    width: 400,
    height: 400,
    flex: {
      dir: 'row',
      alignItems: 'stretch',
      justifyContent: 'start',
      verticalSizing: 'auto',
    },
  },
});

console.log('board:', board);

const square = handleDrawShape({
  shapeType: PenpotShapeType.RECTANGLE,
  params: {
    name: 'HeaderSquare',
    parentId: board.payload.shape.id,
    x: 0,
    y: 0,
    width: 400,
    height: 100,
    fills: [
      { fillColor: '#FFD700' },
    ],
    layoutChild: {
      "absolute": false,
      "horizontalSizing": "auto",
      "verticalSizing": "auto",
      "alignSelf": "auto",
      "horizontalMargin": 0,
      "verticalMargin": 0,
      "topMargin": 0,
      "rightMargin": 0,
      "bottomMargin": 0,
      "leftMargin": 0,
      "maxWidth": null,
      "maxHeight": null,
      "minWidth": null,
      "minHeight": null
  },
  },
});

console.log('square:', square);

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme) => {
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

penpot.ui.onMessage(async (message) => {
  const { type, messageId, payload, source } = message;

  if (source !== MessageSourceName.Client) {
    return ;
  }

  let responseMessage;

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
      responseMessage = getCurrentPage();
      break;

    default:
      responseMessage = {
        source: MessageSourceName.Plugin,
        type: type,
        messageId: messageId,
        message: `unknown command: ${type}`,
        success: false,
      };
      break;
  }
  responseMessage.messageId = messageId;
  penpot.ui.sendMessage(responseMessage);
});

