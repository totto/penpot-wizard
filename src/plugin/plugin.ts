import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  AddImageFromUrlQueryPayload,
  ApplyBlurQueryPayload,
  DrawShapeQueryPayload,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
} from '../types/types';

import { handleDrawShape } from './drawHandlers';
import { handleGetProjectData, handleGetUserData, handleAddImageFromUrl, applyBlurTool, getCurrentPage, getAvailableFonts, getCurrentTheme, getActiveUsers, getFileVersions, /* getCurrentSelection, */ createLibraryColor, createLibraryFont, createLibraryComponent, } from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 500,
  height: 700,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme: string) => {
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

penpot.ui.onMessage(async (message: ClientMessage) => {
  // Diagnostic log: print incoming message so we can verify runtime message types.
  // This helps detect mismatches between the UI and the plugin (stale builds, enum differences).
  try {
    console.log('Plugin received message from client:', message);
  } catch {
    // Defensive logging in case message contains unserializable proxies
    console.log('Plugin received message (unserializable) - type maybe present:', (message as unknown as { type?: string })?.type);
  }

  const { type, messageId, payload, source } = message;

  if (source !== MessageSourceName.Client) {
    return ;
  }

  let responseMessage: PluginResponseMessage;

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responseMessage = handleDrawShape(payload as DrawShapeQueryPayload);
      break;

    case ClientQueryType.ADD_IMAGE_FROM_URL:
      responseMessage = await handleAddImageFromUrl(payload as unknown as AddImageFromUrlQueryPayload);
      break;

    case ClientQueryType.APPLY_BLUR:
      responseMessage = await applyBlurTool(payload as unknown as ApplyBlurQueryPayload);
      break;

    case ClientQueryType.GET_USER_DATA:
      responseMessage = handleGetUserData();
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responseMessage = handleGetProjectData();
      break;

    case ClientQueryType.GET_AVAILABLE_FONTS:
      responseMessage = getAvailableFonts();
      break;

    case ClientQueryType.GET_CURRENT_PAGE:
      responseMessage = getCurrentPage();
      break;

    case ClientQueryType.GET_CURRENT_THEME:
      responseMessage = getCurrentTheme();
      break;

    case ClientQueryType.GET_ACTIVE_USERS:
      responseMessage = getActiveUsers();
      break;


    case ClientQueryType.GET_FILE_VERSIONS:
      responseMessage = await getFileVersions();
      break;

    // case ClientQueryType.GET_CURRENT_SELECTION:
    //   responseMessage = getCurrentSelection();
    //   break;
    
    case ClientQueryType.CREATE_LIBRARY_COLOR:
      responseMessage = await createLibraryColor(payload);
      break;
    
    case ClientQueryType.CREATE_LIBRARY_FONT:
      responseMessage = await createLibraryFont(payload as unknown as CreateLibraryFontPayload);
      break;
    
    case ClientQueryType.CREATE_LIBRARY_COMPONENT:
      responseMessage = await createLibraryComponent(payload as unknown as CreateLibraryComponentPayload);
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
