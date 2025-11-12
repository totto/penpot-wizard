import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  AddImageFromUrlQueryPayload,
  ApplyBlurQueryPayload,
  ApplyFillQueryPayload,
  ApplyStrokeQueryPayload,
  ApplyShadowQueryPayload,
  AlignHorizontalQueryPayload,
  AlignVerticalQueryPayload,
  CenterAlignmentQueryPayload,
  DistributeHorizontalQueryPayload,
  ApplyLinearGradientQueryPayload,
  ApplyRadialGradientQueryPayload,
  DrawShapeQueryPayload,
  PluginResponseMessage,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  UndoLastActionQueryPayload,
  RedoLastActionQueryPayload,
} from '../types/types';

import { handleDrawShape } from './drawHandlers';
import { 
  handleGetProjectData, 
  handleGetUserData, 
  handleAddImageFromUrl, 
  applyBlurTool, 
  applyFillTool, 
  applyStrokeTool, 
  applyShadowTool,
  alignHorizontalTool,
  alignVerticalTool,
  centerAlignmentTool,
  distributeHorizontalTool,
  applyLinearGradientTool, 
  applyRadialGradientTool, 
  getCurrentPage, 
  getAvailableFonts, 
  getCurrentTheme, 
  getActiveUsers, 
  getFileVersions, 
  createLibraryColor, 
  createLibraryFont, 
  createLibraryComponent, 
  updateCurrentSelection, 
  undoLastAction, 
  redoLastAction 
} from './mainHandlers';

console.log('AI Agent Chat Plugin loaded successfully!')

// Listen for selection changes
penpot.on('selectionchange', (selectedIds: string[]) => {
  console.log('🔍 Selection change event fired with IDs:', selectedIds);
  try {
    // Defensive check: ensure selectedIds is an array of strings
    if (Array.isArray(selectedIds)) {
      const validIds = selectedIds.filter(id => typeof id === 'string' && id.length > 0);
      console.log('✅ Filtered valid IDs:', validIds);
      updateCurrentSelection(validIds);
    } else {
      console.warn('❌ Selection change event received invalid data:', selectedIds);
      updateCurrentSelection([]);
    }
  } catch (error) {
    console.warn('❌ Error in selection change handler:', error);
    updateCurrentSelection([]);
  }
});

// Initial selection will be captured by the selectionchange listener when user makes selections
console.log('Plugin loaded - selection tracking active');

// Try to capture initial selection on plugin load (more aggressive approach)
setTimeout(() => {
  try {
    console.log('🔍 Checking for initial selection...');
    const directSel = penpot.selection;
    if (directSel && Array.isArray(directSel) && directSel.length > 0) {
      const initialIds = directSel
        .map((shape: unknown) => (shape as { id?: string })?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (initialIds.length > 0) {
        console.log('📝 Capturing initial selection:', initialIds);
        updateCurrentSelection(initialIds);
      }
    } else {
      console.log('ℹ️ No initial selection found');
    }
  } catch (error) {
    console.warn('⚠️ Could not capture initial selection:', error);
  }
}, 100); // Shorter timeout for more responsive initial capture


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

    case ClientQueryType.APPLY_FILL:
      responseMessage = await applyFillTool(payload as unknown as ApplyFillQueryPayload);
      break;

    case ClientQueryType.APPLY_STROKE:
      responseMessage = await applyStrokeTool(payload as unknown as ApplyStrokeQueryPayload);
      break;

    case ClientQueryType.APPLY_SHADOW:
      responseMessage = await applyShadowTool(payload as unknown as ApplyShadowQueryPayload);
      break;

    case ClientQueryType.ALIGN_HORIZONTAL:
      responseMessage = await alignHorizontalTool(payload as unknown as AlignHorizontalQueryPayload);
      break;

    case ClientQueryType.ALIGN_VERTICAL:
      responseMessage = await alignVerticalTool(payload as unknown as AlignVerticalQueryPayload);
      break;

    case ClientQueryType.CENTER_ALIGNMENT:
      responseMessage = await centerAlignmentTool(payload as unknown as CenterAlignmentQueryPayload);
      break;

    case ClientQueryType.DISTRIBUTE_HORIZONTAL:
      responseMessage = await distributeHorizontalTool(payload as unknown as DistributeHorizontalQueryPayload);
      break;

    case ClientQueryType.APPLY_LINEAR_GRADIENT:
      responseMessage = await applyLinearGradientTool(payload as unknown as ApplyLinearGradientQueryPayload);
      break;

    case ClientQueryType.APPLY_RADIAL_GRADIENT:
      responseMessage = await applyRadialGradientTool(payload as unknown as ApplyRadialGradientQueryPayload);
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

    
    case ClientQueryType.CREATE_LIBRARY_COLOR:
      responseMessage = await createLibraryColor(payload);
      break;
    
    case ClientQueryType.CREATE_LIBRARY_FONT:
      responseMessage = await createLibraryFont(payload as unknown as CreateLibraryFontPayload);
      break;
    
    case ClientQueryType.CREATE_LIBRARY_COMPONENT:
      responseMessage = await createLibraryComponent(payload as unknown as CreateLibraryComponentPayload);
      break;

    case ClientQueryType.UNDO_LAST_ACTION:
      responseMessage = await undoLastAction(payload as unknown as UndoLastActionQueryPayload);
      break;

    case ClientQueryType.REDO_LAST_ACTION:
      responseMessage = await redoLastAction(payload as unknown as RedoLastActionQueryPayload);
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
