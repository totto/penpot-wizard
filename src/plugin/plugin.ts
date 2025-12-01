import {
  PluginMessageType,
  ClientQueryType,
  MessageSourceName,
  ClientMessage,
  AddImageFromUrlQueryPayload,
  AddImageQueryPayload,
  ApplyBlurQueryPayload,
  ApplyFillQueryPayload,
  ApplyStrokeQueryPayload,
  ApplyShadowQueryPayload,
  AlignHorizontalQueryPayload,
  AlignVerticalQueryPayload,
  CenterAlignmentQueryPayload,
  DistributeHorizontalQueryPayload,
  DistributeVerticalQueryPayload,
  GroupQueryPayload,
  UngroupQueryPayload,
  UnionBooleanOperationQueryPayload,
  IntersectionBooleanOperationQueryPayload,
  DifferenceBooleanOperationQueryPayload,
  ExcludeBooleanOperationQueryPayload,
  FlattenSelectionQueryPayload,
  CreateShapeFromSvgQueryPayload,
  ApplyLinearGradientQueryPayload,
  ApplyRadialGradientQueryPayload,
  DrawShapeQueryPayload,
  PluginResponseMessage,
  MoveQueryPayload,
  ToggleSelectionLockQueryPayload,
  ToggleSelectionVisibilityQueryPayload,
  ToggleSelectionProportionLockQueryPayload,
  CreateLibraryFontPayload,
  CreateLibraryComponentPayload,
  UndoLastActionQueryPayload,
  RedoLastActionQueryPayload,
  ExportSelectionAsSvgQueryPayload,
  ResizeQueryPayload,
  RotateQueryPayload,
  CloneSelectionQueryPayload,
  GetSelectionInfoQueryPayload,
  GetSelectionDumpQueryPayload,
  SetSelectionOpacityQueryPayload,
  SetSelectionBlendModeQueryPayload,
  SetSelectionBorderRadiusQueryPayload,
  SetSelectionBoundsQueryPayload,
  FlipSelectionVerticalQueryPayload,
  FlipSelectionHorizontalQueryPayload,
  DeleteSelectionQueryPayload,
  // RemoveSelectionFromParentResponsePayload, // Unused import
  DetachFromComponentQueryPayload,
  SetConstraintsVerticalQueryPayload,
  SetConstraintsHorizontalQueryPayload,
  OpenPageQueryPayload,
  RenamePageQueryPayload,
  ChangePageBackgroundQueryPayload,
  CreatePageQueryPayload,
  BatchCreatePagesQueryPayload,
  ZIndexQueryPayload,
  ConfigureFlexLayoutQueryPayload,
  ConfigureGridLayoutQueryPayload,
  ConfigureRulerGuidesQueryPayload,
  ConfigureBoardGuidesQueryPayload,
} from '../types/types';

import {
  ReadShapeColorsQueryPayload,
  ReadLibraryContextQueryPayload,
  ReadPluginLocalStorageQueryPayload,
  ReadViewportSettingsQueryPayload,
  UploadMediaFromDataQueryPayload
} from '../types/pluginTypes';

import { handleDrawShape } from './drawHandlers';
import {
  handleGetProjectData,
  handleGetUserData,
  handleAddImageFromUrl,
  handleAddImage,
  applyBlurTool,
  applyFillTool,
  // selection update lives in actionSelection (action-only). See actionSelection.ts
  // for mutation-safe helper functions.
  applyStrokeTool,
  applyShadowTool,
  alignHorizontalTool,
  alignVerticalTool,
  centerAlignmentTool,
  distributeHorizontalTool,
  distributeVerticalTool,
  groupTool,
  ungroupTool,
  unionBooleanOperationTool,
  intersectionBooleanOperationTool,
  differenceBooleanOperationTool,
  excludeBooleanOperationTool,
  flattenSelectionTool,
  createShapeFromSvgTool,
  applyLinearGradientTool,
  applyRadialGradientTool,
  getCurrentPage,
  getAvailableFonts,
  getActiveUsers,
  createLibraryColor,
  createLibraryFont,
  createLibraryComponent,
  undoLastAction,
  redoLastAction,
  exportSelectionAsSvgTool,
  resizeTool,
  rotateTool,
  getSelectionInfoTool,
  getSelectionDumpTool,
  moveSelectionTool,
  cloneSelectionTool,
  toggleSelectionLockTool,
  toggleSelectionVisibilityTool,
  setSelectionOpacityTool,
  toggleSelectionProportionLockTool,
  setSelectionBlendModeTool,
  setSelectionBorderRadiusTool,
  setSelectionBoundsTool,
  flipSelectionVerticalTool,
  flipSelectionHorizontalTool,
  deleteSelectionTool,
  detachFromComponentTool,
  setConstraintsVerticalTool,
  setConstraintsHorizontalTool,
  openPageTool,
  renamePageTool,
  changePageBackgroundTool,
  createPageTool,
  batchCreatePagesTool,
  setLayoutZIndexTool,
  readShapeColors,
  configureFlexLayoutTool,
  configureGridLayoutTool,
  configureRulerGuidesTool,
  configureBoardGuidesTool,
  getCurrentThemeTool,
  getFileVersionsTool,
} from './mainHandlers';
import { updateCurrentSelection } from './actionSelection';

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
    return;
  }

  let responseMessage: PluginResponseMessage;

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      responseMessage = handleDrawShape(payload as DrawShapeQueryPayload);
      break;

    case ClientQueryType.ADD_IMAGE_FROM_URL:
      responseMessage = await handleAddImageFromUrl(payload as unknown as AddImageFromUrlQueryPayload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responseMessage = await handleAddImage(payload as unknown as AddImageQueryPayload);
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

    case ClientQueryType.DISTRIBUTE_VERTICAL:
      responseMessage = await distributeVerticalTool(payload as unknown as DistributeVerticalQueryPayload);
      break;

    case ClientQueryType.GROUP:
      responseMessage = await groupTool(payload as unknown as GroupQueryPayload);
      break;

    case ClientQueryType.UNGROUP:
      responseMessage = await ungroupTool(payload as unknown as UngroupQueryPayload);
      break;

    case ClientQueryType.UNION_BOOLEAN_OPERATION:
      responseMessage = await unionBooleanOperationTool(payload as unknown as UnionBooleanOperationQueryPayload);
      break;

    case ClientQueryType.INTERSECTION_BOOLEAN_OPERATION:
      responseMessage = await intersectionBooleanOperationTool(payload as unknown as IntersectionBooleanOperationQueryPayload);
      break;

    case ClientQueryType.DIFFERENCE_BOOLEAN_OPERATION:
      responseMessage = await differenceBooleanOperationTool(payload as unknown as DifferenceBooleanOperationQueryPayload);
      break;

    case ClientQueryType.EXCLUDE_BOOLEAN_OPERATION:
      responseMessage = await excludeBooleanOperationTool(payload as unknown as ExcludeBooleanOperationQueryPayload);
      break;

    case ClientQueryType.FLATTEN_SELECTION:
      responseMessage = await flattenSelectionTool(payload as unknown as FlattenSelectionQueryPayload);
      break;

    case ClientQueryType.CREATE_SHAPE_FROM_SVG:
      responseMessage = await createShapeFromSvgTool(payload as unknown as CreateShapeFromSvgQueryPayload);
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
      responseMessage = await getCurrentThemeTool();
      break;

    case ClientQueryType.GET_ACTIVE_USERS:
      responseMessage = getActiveUsers();
      break;


    case ClientQueryType.GET_FILE_VERSIONS:
      responseMessage = await getFileVersionsTool();
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

    case ClientQueryType.EXPORT_SELECTION_AS_SVG:
      responseMessage = await exportSelectionAsSvgTool(payload as unknown as ExportSelectionAsSvgQueryPayload);
      break;

    case ClientQueryType.RESIZE:
      responseMessage = await resizeTool(payload as unknown as ResizeQueryPayload);
      break;

    case ClientQueryType.ROTATE:
      responseMessage = await rotateTool(payload as unknown as RotateQueryPayload);
      break;

    case ClientQueryType.GET_SELECTION_INFO:
      responseMessage = await getSelectionInfoTool(payload as unknown as GetSelectionInfoQueryPayload);
      break;

    case ClientQueryType.GET_SELECTION_DUMP:
      responseMessage = await getSelectionDumpTool(payload as unknown as GetSelectionDumpQueryPayload);
      break;

    case ClientQueryType.MOVE:
      responseMessage = await moveSelectionTool(payload as unknown as MoveQueryPayload);
      break;

    case ClientQueryType.TOGGLE_SELECTION_LOCK:
      responseMessage = await toggleSelectionLockTool(payload as unknown as ToggleSelectionLockQueryPayload);
      break;
    case ClientQueryType.TOGGLE_SELECTION_PROPORTION_LOCK:
      responseMessage = await toggleSelectionProportionLockTool(payload as unknown as ToggleSelectionProportionLockQueryPayload);
      break;
    case ClientQueryType.TOGGLE_SELECTION_VISIBILITY:
      responseMessage = await toggleSelectionVisibilityTool(payload as unknown as ToggleSelectionVisibilityQueryPayload);
      break;

    case ClientQueryType.FLIP_SELECTION_VERTICAL:
      responseMessage = await flipSelectionVerticalTool(payload as unknown as FlipSelectionVerticalQueryPayload);
    case ClientQueryType.FLIP_SELECTION_HORIZONTAL:
      responseMessage = await flipSelectionHorizontalTool(payload as unknown as FlipSelectionHorizontalQueryPayload);
      break;
    case ClientQueryType.TOGGLE_SELECTION_VISIBILITY:
      responseMessage = await toggleSelectionVisibilityTool(payload as unknown as ToggleSelectionVisibilityQueryPayload);
      break;

    case ClientQueryType.FLIP_SELECTION_VERTICAL:
      responseMessage = await flipSelectionVerticalTool(payload as unknown as FlipSelectionVerticalQueryPayload);
    case ClientQueryType.FLIP_SELECTION_HORIZONTAL:
      responseMessage = await flipSelectionHorizontalTool(payload as unknown as FlipSelectionHorizontalQueryPayload);
      break;

    case ClientQueryType.CLONE_SELECTION:
      responseMessage = await cloneSelectionTool(payload as unknown as CloneSelectionQueryPayload);
      break;
    case ClientQueryType.SET_SELECTION_OPACITY:
      responseMessage = await setSelectionOpacityTool(payload as unknown as SetSelectionOpacityQueryPayload);
      break;
    case ClientQueryType.SET_SELECTION_BOUNDS:
      responseMessage = await setSelectionBoundsTool(payload as unknown as SetSelectionBoundsQueryPayload);
      break;
    case ClientQueryType.SET_SELECTION_BORDER_RADIUS:
      responseMessage = await setSelectionBorderRadiusTool(payload as unknown as SetSelectionBorderRadiusQueryPayload);
      break;

    case ClientQueryType.SET_SELECTION_BLEND_MODE:
      responseMessage = await setSelectionBlendModeTool(payload as unknown as SetSelectionBlendModeQueryPayload);
      break;

    case ClientQueryType.DELETE_SELECTION:
      responseMessage = await deleteSelectionTool(payload as unknown as DeleteSelectionQueryPayload);
      break;

    case ClientQueryType.DETACH_FROM_COMPONENT:
      responseMessage = await detachFromComponentTool(payload as unknown as DetachFromComponentQueryPayload);
      break;
    case ClientQueryType.SET_CONSTRAINTS_VERTICAL:
      responseMessage = await setConstraintsVerticalTool(payload as unknown as SetConstraintsVerticalQueryPayload);
      break;

    case ClientQueryType.SET_CONSTRAINTS_HORIZONTAL:
      responseMessage = await setConstraintsHorizontalTool(payload as unknown as SetConstraintsHorizontalQueryPayload);
      break;

    case ClientQueryType.OPEN_PAGE:
      responseMessage = await openPageTool(payload as unknown as OpenPageQueryPayload);
      break;

    case ClientQueryType.RENAME_PAGE:
      responseMessage = await renamePageTool(payload as unknown as RenamePageQueryPayload);
      break;

    case ClientQueryType.CHANGE_PAGE_BACKGROUND:
      responseMessage = await changePageBackgroundTool(payload as unknown as ChangePageBackgroundQueryPayload);
      break;

    case ClientQueryType.CREATE_PAGE:
      responseMessage = await createPageTool(payload as unknown as CreatePageQueryPayload);
      break;

    case ClientQueryType.BATCH_CREATE_PAGES:
      responseMessage = await batchCreatePagesTool(payload as unknown as BatchCreatePagesQueryPayload);
      break;

    case ClientQueryType.Z_INDEX_ACTION:
      responseMessage = await setLayoutZIndexTool(payload as unknown as ZIndexQueryPayload);
      break;

    case ClientQueryType.READ_SHAPE_COLORS:
      responseMessage = await readShapeColors(payload as unknown as ReadShapeColorsQueryPayload);
      break;


    case ClientQueryType.CONFIGURE_FLEX_LAYOUT:
      responseMessage = await configureFlexLayoutTool(payload as unknown as ConfigureFlexLayoutQueryPayload);
      break;

    case ClientQueryType.CONFIGURE_GRID_LAYOUT:
      responseMessage = await configureGridLayoutTool(payload as unknown as ConfigureGridLayoutQueryPayload);
      break;

    case ClientQueryType.CONFIGURE_RULER_GUIDES:
      responseMessage = await configureRulerGuidesTool(payload as unknown as ConfigureRulerGuidesQueryPayload);
      break;

    case ClientQueryType.CONFIGURE_BOARD_GUIDES:
      responseMessage = await configureBoardGuidesTool(payload as unknown as ConfigureBoardGuidesQueryPayload);
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
