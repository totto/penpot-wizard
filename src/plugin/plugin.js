import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
} from '../types/types';

import {
  handleDrawShape,
  handleCreateComponent,
  handleCreateGroup,
  handleCreateBoard,
  handleModifyShape,
  handleModifyBoard,
  handleModifyComponent,
  handleModifyTextRange,
  handleRotateShape,
  handleCloneShape,
  handleDeleteShape,
  handleBringToFrontShape,
  handleBringForwardShape,
  handleSendToBackShape,
  handleSendBackwardShape,
  handleConvertGroupToBoard,
  handleConvertGroupToComponent,
  handleConvertBoardToComponent,
  handleCreateBoolean,
  handleUngroupShape,
  handleAlignShapes,
  handleDistributeShapes,
  handleAddInteraction,
  handleCreateFlow,
  handleRemoveFlow,
} from './drawHandlers';

import {
  handleGetProjectData,
  handleGetUserData,
  handleGetFonts,
  handleAddImage,
  handleCreateShapeFromSvg,
  getCurrentPage,
  getSelectedShapes,
} from './mainHandlers';

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

  try {
  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responseMessage = handleDrawShape(payload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responseMessage = await handleAddImage(payload);
      break;

    case ClientQueryType.CREATE_SHAPE_FROM_SVG:
      responseMessage = handleCreateShapeFromSvg(payload);
      break;

    case ClientQueryType.CREATE_COMPONENT:
      responseMessage = handleCreateComponent(payload);
      break;

    case ClientQueryType.CREATE_GROUP:
      responseMessage = handleCreateGroup(payload);
      break;

    case ClientQueryType.CREATE_BOARD:
      responseMessage = handleCreateBoard(payload);
      break;

    case ClientQueryType.MODIFY_BOARD:
      responseMessage = handleModifyBoard(payload);
      break;

    case ClientQueryType.MODIFY_COMPONENT:
      responseMessage = handleModifyComponent(payload);
      break;

    case ClientQueryType.CONVERT_GROUP_TO_BOARD:
      responseMessage = handleConvertGroupToBoard(payload);
      break;

    case ClientQueryType.CONVERT_GROUP_TO_COMPONENT:
      responseMessage = handleConvertGroupToComponent(payload);
      break;

    case ClientQueryType.CONVERT_BOARD_TO_COMPONENT:
      responseMessage = handleConvertBoardToComponent(payload);
      break;

    case ClientQueryType.CREATE_BOOLEAN:
      responseMessage = handleCreateBoolean(payload);
      break;

    case ClientQueryType.UNGROUP_SHAPE:
      responseMessage = handleUngroupShape(payload);
      break;

    case ClientQueryType.ALIGN_SHAPES:
      responseMessage = handleAlignShapes(payload);
      break;

    case ClientQueryType.DISTRIBUTE_SHAPES:
      responseMessage = handleDistributeShapes(payload);
      break;

    case ClientQueryType.ADD_INTERACTION:
      responseMessage = handleAddInteraction(payload);
      break;

    case ClientQueryType.CREATE_FLOW:
      responseMessage = handleCreateFlow(payload);
      break;

    case ClientQueryType.REMOVE_FLOW:
      responseMessage = handleRemoveFlow(payload);
      break;

    case ClientQueryType.MODIFY_SHAPE:
      responseMessage = handleModifyShape(payload);
      break;

    case ClientQueryType.MODIFY_TEXT_RANGE:
      responseMessage = handleModifyTextRange(payload);
      break;

    case ClientQueryType.ROTATE_SHAPE:
      responseMessage = handleRotateShape(payload);
      break;

    case ClientQueryType.CLONE_SHAPE:
      responseMessage = handleCloneShape(payload);
      break;

    case ClientQueryType.DELETE_SHAPE:
      responseMessage = handleDeleteShape(payload);
      break;

    case ClientQueryType.BRING_TO_FRONT_SHAPE:
      responseMessage = handleBringToFrontShape(payload);
      break;

    case ClientQueryType.BRING_FORWARD_SHAPE:
      responseMessage = handleBringForwardShape(payload);
      break;

    case ClientQueryType.SEND_TO_BACK_SHAPE:
      responseMessage = handleSendToBackShape(payload);
      break;

    case ClientQueryType.SEND_BACKWARD_SHAPE:
      responseMessage = handleSendBackwardShape(payload);
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

    case ClientQueryType.GET_SELECTED_SHAPES:
      responseMessage = getSelectedShapes();
      break;

    case ClientQueryType.GET_FONTS:
      responseMessage = handleGetFonts(payload);
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
  } catch (err) {
    responseMessage = {
      success: false,
      message: 'Plugin handler error',
      payload: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
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

