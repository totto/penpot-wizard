import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
} from '../types/types';

import {
  handleDrawShape,
  handleCreateGroup,
  handleModifyShape,
  handleModifyBoard,
  handleModifyTextRange,
  handleRotateShape,
  handleCloneShape,
  handleDeleteShape,
  handleBringToFrontShape,
  handleBringForwardShape,
  handleSendToBackShape,
  handleSendBackwardShape,
  handleConvertShapesToBoard,
  handleConvertShapesToComponent,
  handleCreateBoolean,
  handleUngroupShape,
  handleAlignShapes,
  handleDistributeShapes,
  handleAddInteraction,
  handleCreateFlow,
  handleRemoveFlow,
  handleCreateTokensSet,
  handleActivateTokensSet,
  handleApplyTokens,
  handleGetTokensSets,
  handleRemoveTokensSet,
  handleModifyTokensSet,
} from './drawHandlers';

import {
  handleGetUserData,
  handleGetFonts,
  handleAddImage,
  handleCreateShapeFromSvg,
  getCurrentPage,
  getSelectedShapes,
  handleGetShape,
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

penpot.on('selectionchange', () => {
console.log('selectionchange', penpot.selection);
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

    case ClientQueryType.CREATE_GROUP:
      responseMessage = handleCreateGroup(payload);
      break;

    case ClientQueryType.MODIFY_BOARD:
      responseMessage = handleModifyBoard(payload);
      break;

    case ClientQueryType.CONVERT_SHAPES_TO_BOARD:
      responseMessage = handleConvertShapesToBoard(payload);
      break;

    case ClientQueryType.CONVERT_SHAPES_TO_COMPONENT:
      responseMessage = handleConvertShapesToComponent(payload);
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

    case ClientQueryType.CREATE_TOKENS_SET:
      responseMessage = handleCreateTokensSet(payload);
      break;

    case ClientQueryType.ACTIVATE_TOKENS_SET:
      responseMessage = handleActivateTokensSet(payload);
      break;

    case ClientQueryType.APPLY_TOKENS:
      responseMessage = handleApplyTokens(payload);
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

    case ClientQueryType.GET_TOKENS_SETS:
      responseMessage = handleGetTokensSets();
      break;

    case ClientQueryType.REMOVE_TOKENS_SET:
      responseMessage = handleRemoveTokensSet(payload);
      break;

    case ClientQueryType.MODIFY_TOKENS_SET:
      responseMessage = handleModifyTokensSet(payload);
      break;

    case ClientQueryType.GET_CURRENT_PAGE:
      responseMessage = getCurrentPage();
      break;

    case ClientQueryType.GET_SHAPE:
      responseMessage = handleGetShape(payload);
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

