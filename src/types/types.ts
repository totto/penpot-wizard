import { AnyOrama } from '@orama/orama';
import { Experimental_Agent as Agent, Tool, ToolSet, JSONSchema7 } from 'ai';
import { ZodType } from 'zod';
import type { Shape, ImageData as PenpotImageData, User } from '@penpot/plugin-types';
import { PenpotShapeProperties } from './shapeTypes';

/**
 * Message types for communication between Penpot plugin and app
 */
export enum MessageSourceName {
  Plugin = 'penpotWizardPlugin',
  Client = 'penpotWizardClient',
}

export enum PluginMessageType {
  THEME_CHANGE = 'THEME_CHANGE',
}

// Enum for messages sent from the Penpot app to the plugin
export enum ClientQueryType {
  GET_USER_DATA = 'GET_USER_DATA',
  GET_PROJECT_DATA = 'GET_PROJECT_DATA',
  GET_AVAILABLE_FONTS = 'GET_AVAILABLE_FONTS',
  GET_CURRENT_PAGE = 'GET_CURRENT_PAGE',
  GET_CURRENT_THEME = 'GET_CURRENT_THEME',
  GET_ACTIVE_USERS = 'GET_ACTIVE_USERS',
  GET_FILE_VERSIONS = 'GET_FILE_VERSIONS',
  GET_SELECTION_INFO = 'GET_SELECTION_INFO',
  GET_SELECTION_DUMP = 'GET_SELECTION_DUMP',
  CREATE_LIBRARY_COLOR = 'CREATE_LIBRARY_COLOR',
  CREATE_LIBRARY_FONT = 'CREATE_LIBRARY_FONT',
  CREATE_LIBRARY_COMPONENT = 'CREATE_LIBRARY_COMPONENT',
  DRAW_SHAPE = 'DRAW_SHAPE',
  ADD_IMAGE = 'ADD_IMAGE',
  ADD_IMAGE_FROM_URL = 'ADD_IMAGE_FROM_URL',
  APPLY_BLUR = 'APPLY_BLUR',
  APPLY_FILL = 'APPLY_FILL',
  APPLY_STROKE = 'APPLY_STROKE',
  APPLY_LINEAR_GRADIENT = 'APPLY_LINEAR_GRADIENT',
  APPLY_RADIAL_GRADIENT = 'APPLY_RADIAL_GRADIENT',
  APPLY_SHADOW = 'APPLY_SHADOW',
  SET_SELECTION_OPACITY = 'SET_SELECTION_OPACITY',
  SET_SELECTION_BORDER_RADIUS = 'SET_SELECTION_BORDER_RADIUS',
  SET_SELECTION_BOUNDS = 'SET_SELECTION_BOUNDS',
  SET_SELECTION_BLEND_MODE = 'SET_SELECTION_BLEND_MODE',
  ALIGN_HORIZONTAL = 'ALIGN_HORIZONTAL',
  ALIGN_VERTICAL = 'ALIGN_VERTICAL',
  CENTER_ALIGNMENT = 'CENTER_ALIGNMENT',
  DISTRIBUTE_HORIZONTAL = 'DISTRIBUTE_HORIZONTAL',
  DISTRIBUTE_VERTICAL = 'DISTRIBUTE_VERTICAL',
  GROUP = 'GROUP',
  UNGROUP = 'UNGROUP',
  UNION_BOOLEAN_OPERATION = 'UNION_BOOLEAN_OPERATION',
  INTERSECTION_BOOLEAN_OPERATION = 'INTERSECTION_BOOLEAN_OPERATION',
  DIFFERENCE_BOOLEAN_OPERATION = 'DIFFERENCE_BOOLEAN_OPERATION',
  EXCLUDE_BOOLEAN_OPERATION = 'EXCLUDE_BOOLEAN_OPERATION',
  FLATTEN_SELECTION = 'FLATTEN_SELECTION',
  CREATE_SHAPE_FROM_SVG = 'CREATE_SHAPE_FROM_SVG',
  EXPORT_SELECTION_AS_SVG = 'EXPORT_SELECTION_AS_SVG',

  UNDO_LAST_ACTION = 'UNDO_LAST_ACTION',
  REDO_LAST_ACTION = 'REDO_LAST_ACTION',
  RESIZE = 'RESIZE',
  ROTATE = 'ROTATE',
  MOVE = 'MOVE',
  TOGGLE_SELECTION_LOCK = 'TOGGLE_SELECTION_LOCK',
  TOGGLE_SELECTION_PROPORTION_LOCK = 'TOGGLE_SELECTION_PROPORTION_LOCK',
  TOGGLE_SELECTION_VISIBILITY = 'TOGGLE_SELECTION_VISIBILITY',
  CLONE_SELECTION = 'CLONE_SELECTION',
  FLIP_SELECTION_HORIZONTAL = 'FLIP_SELECTION_HORIZONTAL',
  FLIP_SELECTION_VERTICAL = 'FLIP_SELECTION_VERTICAL',
  DELETE_SELECTION = 'DELETE_SELECTION',
  DETACH_FROM_COMPONENT = 'DETACH_FROM_COMPONENT',
  SET_CONSTRAINTS_HORIZONTAL = 'SET_CONSTRAINTS_HORIZONTAL',
  SET_CONSTRAINTS_VERTICAL = 'SET_CONSTRAINTS_VERTICAL',
  OPEN_PAGE = 'OPEN_PAGE',
  CREATE_PAGE = 'CREATE_PAGE',
  CHANGE_PAGE_BACKGROUND = 'CHANGE_PAGE_BACKGROUND',
  RENAME_PAGE = 'RENAME_PAGE',
  Z_INDEX_ACTION = 'Z_INDEX_ACTION',
  READ_SHAPE_COLORS = 'READ_SHAPE_COLORS',
  READ_LIBRARY_CONTEXT = 'READ_LIBRARY_CONTEXT',
  READ_PLUGIN_LOCAL_STORAGE = 'READ_PLUGIN_LOCAL_STORAGE',
  READ_VIEWPORT_SETTINGS = 'READ_VIEWPORT_SETTINGS',
  UPLOAD_MEDIA_TO_LIBRARY = 'UPLOAD_MEDIA_TO_LIBRARY',
  NAVIGATE_TO_BOARD = 'NAVIGATE_TO_BOARD',
  OPEN_BOARD_AS_OVERLAY = 'OPEN_BOARD_AS_OVERLAY',
  TOGGLE_OVERLAY = 'TOGGLE_OVERLAY',
  NAVIGATE_PREVIOUS_SCREEN = 'NAVIGATE_PREVIOUS_SCREEN',
  OPEN_EXTERNAL_URL = 'OPEN_EXTERNAL_URL',
  LIST_ALL_BOARDS = 'LIST_ALL_BOARDS',
  CONFIGURE_INTERACTION_FLOW = 'CONFIGURE_INTERACTION_FLOW',
  APPLY_ANIMATION_TO_SELECTION = 'APPLY_ANIMATION_TO_SELECTION',
  CONFIGURE_FLEX_LAYOUT = 'CONFIGURE_FLEX_LAYOUT',
  CONFIGURE_GRID_LAYOUT = 'CONFIGURE_GRID_LAYOUT',
  CONFIGURE_RULER_GUIDES = 'CONFIGURE_RULER_GUIDES',
  CONFIGURE_BOARD_GUIDES = 'CONFIGURE_BOARD_GUIDES',
  BATCH_CREATE_PAGES = 'BATCH_CREATE_PAGES',
  BATCH_CREATE_COMPONENTS = 'BATCH_CREATE_COMPONENTS',
  GET_COLOR_PALETTE = 'GET_COLOR_PALETTE',
  USE_SIZE_PRESET = 'USE_SIZE_PRESET',
}

export enum PenpotShapeType {
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  PATH = 'path',
  TEXT = 'text',
  BOARD = 'board',
}

export interface ClientMessage {
  source: MessageSourceName.Client;
  type: ClientQueryType;
  messageId: string;
  payload?: DrawShapeQueryPayload
  | AddImageQueryPayload
  | AddImageFromUrlQueryPayload
  | ApplyBlurQueryPayload
  | ApplyFillQueryPayload
  | ApplyStrokeQueryPayload
  | ApplyLinearGradientQueryPayload
  | ApplyRadialGradientQueryPayload
  | ApplyShadowQueryPayload
  | SetSelectionOpacityQueryPayload
  | SetSelectionBorderRadiusQueryPayload
  | SetSelectionBlendModeQueryPayload
  | AlignHorizontalQueryPayload
  | AlignVerticalQueryPayload
  | CenterAlignmentQueryPayload
  | DistributeHorizontalQueryPayload
  | DistributeVerticalQueryPayload
  | GroupQueryPayload
  | UngroupQueryPayload
  | UnionBooleanOperationQueryPayload
  | IntersectionBooleanOperationQueryPayload
  | DifferenceBooleanOperationQueryPayload
  | ExcludeBooleanOperationQueryPayload
  | FlattenSelectionQueryPayload
  | CreateShapeFromSvgQueryPayload
  | ExportSelectionAsSvgQueryPayload
  | UndoLastActionQueryPayload
  | RedoLastActionQueryPayload
  | ResizeQueryPayload
  | GetSelectionInfoQueryPayload
  | MoveQueryPayload
  | CloneSelectionQueryPayload
  | ToggleSelectionLockQueryPayload
  | ToggleSelectionProportionLockQueryPayload
  | FlipSelectionHorizontalQueryPayload
  | FlipSelectionVerticalQueryPayload
  | ZIndexQueryPayload
  | ConfigureFlexLayoutQueryPayload
  | ConfigureGridLayoutQueryPayload;

}

export interface DrawShapeQueryPayload {
  shapeType: PenpotShapeType;
  params: PenpotShapeProperties;
};

export interface AddImageQueryPayload {
  name: string;
  data: Uint8Array;
  mimeType: string;
}

export interface AddImageFromUrlQueryPayload {
  name: string;
  url: string;
}

export interface ApplyBlurQueryPayload {
  blurValue?: number;
}

export interface ApplyFillQueryPayload {
  fillColor?: string;
  fillOpacity?: number;
}

export interface ApplyStrokeQueryPayload {
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'mixed';
  overrideExisting?: boolean; // Whether to override existing strokes without asking
}

export interface ApplyLinearGradientQueryPayload {
  colors: string[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  angle?: number;
}

export interface ApplyRadialGradientQueryPayload {
  colors: string[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface ApplyShadowQueryPayload {
  shadowStyle?: 'drop-shadow' | 'inner-shadow';
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  overrideExisting?: boolean; // Whether to override existing shadows without asking
}

export interface SetSelectionOpacityQueryPayload {
  opacity?: number;
}

export interface SetSelectionBorderRadiusQueryPayload {
  borderRadius?: number; // in pixels
}

export interface SetSelectionBoundsQueryPayload {
  // Any of the four bounds can be provided. If a value is omitted it will not be changed.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SetSelectionBlendModeQueryPayload {
  blendMode?: string;
}

export interface AlignHorizontalQueryPayload {
  alignment: 'left' | 'center' | 'right';
}

export interface AlignVerticalQueryPayload {
  alignment: 'top' | 'center' | 'bottom';
}

export type CenterAlignmentQueryPayload = Record<string, never>;

export type DistributeHorizontalQueryPayload = Record<string, never>;

export type DistributeVerticalQueryPayload = Record<string, never>;

export type GroupQueryPayload = Record<string, never>;

export type UngroupQueryPayload = Record<string, never>;

export type UnionBooleanOperationQueryPayload = Record<string, never>;

export type IntersectionBooleanOperationQueryPayload = Record<string, never>;

export type DifferenceBooleanOperationQueryPayload = Record<string, never>;

export type ExcludeBooleanOperationQueryPayload = Record<string, never>;

export type FlattenSelectionQueryPayload = Record<string, never>;

export interface CreateShapeFromSvgQueryPayload {
  svgString: string;
  name?: string; // Optional name for the created shape
}

export interface UndoLastActionQueryPayload {
  actionId?: string; // Optional: specify which action to undo, otherwise undo the last one
}

export interface RedoLastActionQueryPayload {
  actionId?: string; // Optional: specify which action to redo, otherwise redo the last undone one
}

export interface FlipSelectionHorizontalQueryPayload {
  // Optional shape IDs to flip. If omitted, use current selection.
  shapeIds?: string[];
}

export interface FlipSelectionVerticalQueryPayload {
  // Optional shape IDs to flip. If omitted, use current selection.
  shapeIds?: string[];
}

export interface DeleteSelectionQueryPayload {
  // Optional shape IDs to delete. If omitted, use current selection.
  shapeIds?: string[];
}

export interface DetachFromComponentQueryPayload {
  shapeIds?: string[];
}

export interface SetConstraintsHorizontalQueryPayload {
  shapeIds?: string[];
  constraint: 'left' | 'right' | 'leftright' | 'center' | 'scale';
}

export interface SetConstraintsVerticalQueryPayload {
  shapeIds?: string[];
  constraint: 'top' | 'bottom' | 'topbottom' | 'center' | 'scale';
}

export interface OpenPageQueryPayload {
  pageId?: string;
  pageName?: string;
}

export interface CreatePageQueryPayload {
  name?: string;
  openAfterCreate?: boolean;
}

export interface ChangePageBackgroundQueryPayload {
  pageId?: string;
  backgroundColor: string;
}

export interface RenamePageQueryPayload {
  pageId?: string;
  newName: string;
}

export interface ZIndexQueryPayload {
  action: 'bring-to-front' | 'send-to-back' | 'bring-forward' | 'send-backward' | 'set-index';
  shapeIds?: string[];
  index?: number; // Optional, for 'set-index' action
}

export interface ConfigureFlexLayoutQueryPayload {
  shapeIds?: string[]; // If omitted, use current selection

  // Container properties
  remove?: boolean; // If true, remove the flex layout
  dir?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  wrap?: 'wrap' | 'nowrap';
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  alignContent?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  rowGap?: number;
  columnGap?: number;
  topPadding?: number;
  rightPadding?: number;
  bottomPadding?: number;
  leftPadding?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  horizontalSizing?: 'fit-content' | 'fill' | 'auto';
  verticalSizing?: 'fit-content' | 'fill' | 'auto';

  // Child properties (apply to children within the layout)
  childProperties?: {
    shapeIds?: string[]; // Specific children to modify (if omitted, apply to all children)
    absolute?: boolean;
    zIndex?: number;
    horizontalSizing?: 'auto' | 'fill' | 'fix';
    verticalSizing?: 'auto' | 'fill' | 'fix';
    alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch';
    topMargin?: number;
    rightMargin?: number;
    bottomMargin?: number;
    leftMargin?: number;
    horizontalMargin?: number;
    verticalMargin?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface ConfigureGridLayoutQueryPayload {
  shapeIds?: string[];
  remove?: boolean;

  // Container properties
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  alignContent?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  rowGap?: number;
  columnGap?: number;
  topPadding?: number;
  rightPadding?: number;
  bottomPadding?: number;
  leftPadding?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  horizontalSizing?: 'fit-content' | 'fill' | 'auto';
  verticalSizing?: 'fit-content' | 'fill' | 'auto';

  // Grid Structure
  rows?: Array<{ type: 'flex' | 'fixed' | 'percent' | 'auto'; value: number | null }>;
  columns?: Array<{ type: 'flex' | 'fixed' | 'percent' | 'auto'; value: number | null }>;

  // Operations
  addRows?: Array<{ type: 'flex' | 'fixed' | 'percent' | 'auto'; value: number | null; index?: number }>;
  addColumns?: Array<{ type: 'flex' | 'fixed' | 'percent' | 'auto'; value: number | null; index?: number }>;
  removeRowIndices?: number[];
  removeColumnIndices?: number[];

  // Child properties (including Grid Cell properties)
  childProperties?: {
    shapeIds?: string[];
    absolute?: boolean;
    zIndex?: number;
    horizontalSizing?: 'auto' | 'fill' | 'fix';
    verticalSizing?: 'auto' | 'fill' | 'fix';
    alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch';
    justifySelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch'; // Grid specific
    topMargin?: number;
    rightMargin?: number;
    bottomMargin?: number;
    leftMargin?: number;
    horizontalMargin?: number;
    verticalMargin?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;

    // Grid Cell Properties
    row?: number;
    column?: number;
    rowSpan?: number;
    columnSpan?: number;
  };
}

export interface ConfigureRulerGuidesQueryPayload {
  scope: 'page' | 'board';
  shapeIds?: string[]; // For board scope

  addGuides?: Array<{
    orientation: 'horizontal' | 'vertical';
    position: number;
  }>;

  removeGuides?: Array<{
    orientation: 'horizontal' | 'vertical';
    position: number;
  }>;

  removeAll?: boolean;
}

export interface ConfigureBoardGuidesQueryPayload {
  shapeIds?: string[]; // Boards to configure

  action: 'set' | 'add' | 'clear';

  guides?: Array<{
    type: 'column' | 'row' | 'square';
    display?: boolean;

    // Common params
    color?: string;

    // Column/Row params
    count?: number; // Number of columns/rows (will calculate size automatically)
    alignment?: 'stretch' | 'left' | 'center' | 'right';
    size?: number;
    margin?: number;
    itemLength?: number;
    gutter?: number;
  }>;
}


export interface BatchCreatePagesQueryPayload {
  pageNames: string[];
}

export interface BatchCreatePagesResponsePayload {
  pages: Array<{
    id: string;
    name: string;
  }>;
}

export interface BatchCreateComponentsQueryPayload {
  components: Array<{
    name: string;
    shapeIds: string[];
  }>;
}

export interface BatchCreateComponentsResponsePayload {
  components: Array<{
    id: string;
    name: string;
  }>;
}

export type GetColorPaletteQueryPayload = Record<string, never>;

export interface GetColorPaletteResponsePayload {
  colors: Array<{
    id: string;
    name: string;
    color: string; // Hex color value
    opacity?: number;
    path?: string;
  }>;
}


export interface UseSizePresetQueryPayload {
  presetName: string;
  shapeIds?: string[];
}

export interface UseSizePresetResponsePayload {
  success: boolean;
  message: string;
  updatedShapes: Array<{ id: string; name: string; width: number; height: number }>;
}


export type ClientQueryPayload =
  | DrawShapeQueryPayload
  | AddImageQueryPayload
  | AddImageFromUrlQueryPayload
  | ApplyBlurQueryPayload
  | ApplyFillQueryPayload
  | ApplyStrokeQueryPayload
  | ApplyLinearGradientQueryPayload
  | ApplyRadialGradientQueryPayload
  | ApplyShadowQueryPayload
  | SetSelectionOpacityQueryPayload
  | SetSelectionBorderRadiusQueryPayload
  | SetSelectionBlendModeQueryPayload
  | AlignHorizontalQueryPayload
  | AlignVerticalQueryPayload
  | CenterAlignmentQueryPayload
  | DistributeHorizontalQueryPayload
  | DistributeVerticalQueryPayload
  | GroupQueryPayload
  | UngroupQueryPayload
  | CreateShapeFromSvgQueryPayload
  | ExportSelectionAsSvgQueryPayload
  | UndoLastActionQueryPayload
  | RedoLastActionQueryPayload
  | ResizeQueryPayload
  | GetSelectionInfoQueryPayload
  | GetSelectionDumpQueryPayload
  | DeleteSelectionQueryPayload
  | DetachFromComponentQueryPayload
  | SetConstraintsHorizontalQueryPayload
  | SetConstraintsVerticalQueryPayload
  | CloneSelectionQueryPayload
  | MoveQueryPayload
  | ToggleSelectionLockQueryPayload
  | ToggleSelectionVisibilityQueryPayload
  | FlipSelectionHorizontalQueryPayload
  | FlipSelectionVerticalQueryPayload
  | OpenPageQueryPayload
  | CreatePageQueryPayload
  | ChangePageBackgroundQueryPayload
  | RenamePageQueryPayload
  | ZIndexQueryPayload
  | ConfigureFlexLayoutQueryPayload
  | ConfigureGridLayoutQueryPayload
  | ConfigureRulerGuidesQueryPayload
  | ConfigureBoardGuidesQueryPayload
  | BatchCreatePagesQueryPayload
  | BatchCreateComponentsQueryPayload
  | GetColorPaletteQueryPayload
  | UseSizePresetQueryPayload;

// Undo system interfaces
export interface UndoInfo {
  actionType: ClientQueryType; // What type of action was performed
  actionId: string; // Unique ID for this action (for tracking)
  description: string; // Human-readable description of what will be undone
  undoData: Record<string, unknown>; // Data needed to perform the undo
  timestamp: number; // When the action was performed

}

// Payload for cloning selection (UI side)
export interface CloneSelectionQueryPayload {
  offset?: { x?: number; y?: number };
  skipLocked?: boolean;
  keepPosition?: boolean;
  fallback?: 'right' | 'below' | 'grid' | 'auto';
}

export interface PluginMessage {
  source: MessageSourceName.Plugin;
  type: PluginMessageType | ClientQueryType;
  messageId: string;
  message: string;
}
export interface PluginResponseMessage extends PluginMessage {
  success: boolean;
  payload?: PluginResponsePayload;
  undoInfo?: UndoInfo; // Optional undo information for reversible actions
}

export interface DrawShapeResponsePayload {
  shape: Shape;
}
export interface AddImagePayload {
  newImageData: PenpotImageData;
  shapeId?: string;
}

export interface GroupResponsePayload {
  groupId: string;
  groupedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ApplyBlurResponsePayload {
  blurredShapes: string[];
  blurValue: number;
  undoInfo?: UndoInfo;
}

export interface ApplyFillResponsePayload {
  filledShapes: string[];
  fillColor: string;
  fillOpacity: number;
  undoInfo?: UndoInfo;
}

export interface ApplyStrokeResponsePayload {
  strokedShapes?: string[];
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'mixed';
  undoInfo?: UndoInfo;
  shapesWithExistingStrokes?: Array<{ id: string; name?: string }>;
  requestedStroke?: {
    strokeColor: string;
    strokeWidth: number;
    strokeOpacity: number;
    strokeStyle: string;
  };
}

export interface ApplyLinearGradientResponsePayload {
  gradientShapes: string[];
  colors: string[];
  undoInfo?: UndoInfo;
}

export interface ApplyRadialGradientResponsePayload {
  gradientShapes: string[];
  colors: string[];
  undoInfo?: UndoInfo;
}

export interface ApplyShadowResponsePayload {
  shadowedShapes: string[];
  shadowStyle: string;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowSpread: number;
  shapesWithExistingShadows?: Array<{ id: string; name?: string }>;
  requestedShadow?: {
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowBlur: number;
    shadowSpread: number;
    shadowStyle?: string;
  };
  undoInfo?: UndoInfo;
}

export interface SetSelectionOpacityResponsePayload {
  changedShapeIds: string[];
  appliedOpacity: number;
  previousOpacities: Array<number | undefined>;
  undoInfo?: UndoInfo;
}

export interface SetSelectionBorderRadiusResponsePayload {
  changedShapeIds: string[];
  appliedBorderRadius: number;
  previousBorderRadii: Array<number | undefined>;
  undoInfo?: UndoInfo;
  skippedLockedShapes?: Array<{ id: string; name?: string }>;
}

export interface SetSelectionBoundsResponsePayload {
  changedShapeIds: string[];
  appliedBounds?: { x?: number; y?: number; width?: number; height?: number };
  previousBounds: Array<{ x?: number; y?: number; width?: number; height?: number } | undefined>;
  undoInfo?: UndoInfo;
  skippedLockedShapes?: Array<{ id: string; name?: string }>;
}

export interface SetSelectionBoundsPromptResponsePayload {
  shapesWithoutBounds: Array<{ id: string; name?: string }>;
  requestedBounds: { x?: number; y?: number; width?: number; height?: number };
}

export interface SetSelectionBorderRadiusPromptResponsePayload {
  shapesWithoutBorderRadius: Array<{ id: string; name?: string }>;
  requestedBorderRadius: number;
}

export interface SetSelectionBlendModeResponsePayload {
  changedShapeIds: string[];
  appliedBlendMode: string;
  undoInfo?: UndoInfo;
}

// When the plugin finds existing shadows and wants confirmation from the user
// before applying a new shadow this payload is returned. It is separate from
// the successful apply payload because it contains only the shapes that already
// have shadows and the requested shadow parameters for an override prompt.
export interface ApplyShadowPromptResponsePayload {
  shapesWithExistingShadows: Array<{ id: string; name?: string }>;
  requestedShadow: { shadowColor: string; shadowOffsetX: number; shadowOffsetY: number; shadowBlur: number; shadowSpread: number; shadowStyle?: string };
}

export type SelectionBlockerType = 'locked' | 'readOnly' | 'unsupportedType' | 'apiError' | 'unknown';

export interface SelectionConfirmationPromptPayload {
  actionName: string;
  message: string;
  defaultsText?: string;
  examples?: string[];
  blockerType: SelectionBlockerType;
  blockerDetails?: string;
  blockedShapeIds?: string[];
  blockedShapeNames?: string[];
  needsConfirmation: boolean;
  suggestion?: string;
}

export interface AlignHorizontalResponsePayload {
  alignedShapes: Array<{ id: string; name?: string }>;
  alignment: 'left' | 'center' | 'right';
  undoInfo?: UndoInfo;
}

export interface AlignVerticalResponsePayload {
  alignedShapes: Array<{ id: string; name?: string }>;
  alignment: 'top' | 'center' | 'bottom';
  undoInfo?: UndoInfo;
}

export interface CombineShapesResponsePayload {
  combinedShapeId: string;
  combinedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface IntersectShapesResponsePayload {
  intersectedShapeId: string;
  intersectedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface SubtractShapesResponsePayload {
  subtractedShapeId: string;
  subtractedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface UnionBooleanOperationResponsePayload {
  unionShapeId: string;
  unionShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface IntersectionBooleanOperationResponsePayload {
  intersectionShapeId: string;
  intersectionShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface DifferenceBooleanOperationResponsePayload {
  differenceShapeId: string;
  differenceShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ExcludeBooleanOperationResponsePayload {
  excludeShapeId: string;
  excludeShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface FlattenResponsePayload {
  flattenedShapeIds: string[];
  flattenedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface CreateShapeFromSvgResponsePayload {
  createdShape: Shape | null;
  shapeId?: string;
  shapeName?: string;
  svgString: string;
  position?: { x: number; y: number };
}

export interface ExportSelectionAsSvgQueryPayload {
  includeBackground?: boolean;
}



export interface ResizeQueryPayload {
  scaleX?: number; // Scale factor for width (e.g., 1.5 = 50% larger, 0.5 = half size)
  scaleY?: number; // Scale factor for height (e.g., 2.0 = double size)
  maintainAspectRatio?: boolean; // If true, uses scaleX for both dimensions
}

export interface MoveQueryPayload {
  // Relative movement (in screen units / pixels) — use dx/dy for relative moves.
  dx?: number;
  dy?: number;
  // Absolute movement — set the new top-left coordinate for each selected object.
  x?: number;
  y?: number;
}

export interface ToggleSelectionLockQueryPayload {
  // If provided, force lock (true) or unlock (false).
  lock?: boolean;
  // Optional shape IDs to apply the lock/unlock to. If omitted, current selection will be used.
  shapeIds?: string[];
}

export interface ToggleSelectionVisibilityQueryPayload {
  // If provided, force hide (true) or unhide (false).
  hide?: boolean;
  // Optional specific shape IDs to apply the visibility change to. Uses selection if omitted.
  shapeIds?: string[];
}

export interface ToggleSelectionProportionLockQueryPayload {
  // If provided, force turn on proportion lock (true) or off (false)
  // Backwards-compatible: accept either `lock` or `proportionLock` as the intent
  // to turn proportion-lock on/off. Prefer `proportionLock` if both are present.
  lock?: boolean;
  proportionLock?: boolean;
  // Optional shape IDs to apply the change to. If omitted, use current selection.
  shapeIds?: string[];
}

export interface FlipSelectionHorizontalQueryPayload {
  // Optional shape IDs to flip. If omitted, use current selection.
  shapeIds?: string[];
}

export interface RotateQueryPayload {
  /**
   * Rotation angle in degrees. Positive values rotate clockwise.
   * If not provided, the tool will return read-only selection info for UI display.
   */
  angle?: number;
}

export interface MoveResponsePayload {
  movedShapes: Array<{ id: string; name?: string }>;
  previousPositions: Array<{ x?: number; y?: number }>;
  newPositions: Array<{ x?: number; y?: number }>;
  // Shapes that were skipped because they were locked. Names are provided for UI-friendly messages
  skippedLockedIds?: string[];
  skippedLockedNames?: string[];
  undoInfo?: UndoInfo;
}

export interface CloneSelectionPromptResponsePayload {
  lockedShapes: Array<{ id: string; name?: string }>;
  selectionCount: number;
  message?: string;
}

export interface CloneSelectionResponsePayload {
  createdIds: string[];
  undoInfo?: UndoInfo;
}

export interface ToggleSelectionLockResponsePayload {
  lockedShapes?: Array<{ id: string; name?: string }>;
  unlockedShapes?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
  selectionSnapshot?: Array<{ id: string; name?: string | undefined; editorLocked: boolean; editorBlocked: boolean; proportionLocked?: boolean; remainingRatioFlags?: Record<string, unknown> }>;
}

export interface ToggleSelectionVisibilityResponsePayload {
  hiddenShapes?: Array<{ id: string; name?: string }>;
  unhiddenShapes?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ToggleSelectionProportionLockResponsePayload {
  lockedShapes?: Array<{ id: string; name?: string }>;
  unlockedShapes?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
  selectionSnapshot?: Array<{ id: string; name?: string | undefined; finalRatioLocked: boolean; remainingRatioFlags: Record<string, unknown>; editorLocked?: boolean; editorBlocked?: boolean }>;
}

export interface FlipSelectionHorizontalResponsePayload {
  flippedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface FlipSelectionVerticalResponsePayload {
  flippedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface DeleteSelectionResponsePayload {
  deletedShapes: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface DetachFromComponentResponsePayload {
  detachedShapeIds: string[];
  undoInfo?: UndoInfo;
}

export interface SetConstraintsHorizontalResponsePayload {
  updatedShapeIds: string[];
  undoInfo?: UndoInfo;
}

export interface SetConstraintsVerticalResponsePayload {
  updatedShapeIds: string[];
  undoInfo?: UndoInfo;
}

export interface OpenPageResponsePayload {
  pageId: string;
  pageName: string;
  undoInfo?: UndoInfo;
}

export interface CreatePageResponsePayload {
  pageId: string;
  pageName: string;
  undoInfo: UndoInfo;
}

export interface ChangePageBackgroundResponsePayload {
  pageId: string;
  backgroundColor: string;
  undoInfo: UndoInfo;
}

export interface RenamePageResponsePayload {
  pageId: string;
  oldName: string;
  newName: string;
  undoInfo: UndoInfo;
}

export interface ZIndexResponsePayload {
  movedShapes: Array<{ id: string; name?: string }>;
  action: 'bring-to-front' | 'send-to-back' | 'bring-forward' | 'send-backward' | 'set-index';
  targetIndex?: number; // The final index position (for set-index action)
  undoInfo?: UndoInfo;
}

export interface ConfigureFlexLayoutResponsePayload {
  configuredShapes: Array<{ id: string; name?: string }>;
  layoutRemoved?: boolean;
  containerPropertiesSet?: string[]; // List of container properties that were set
  childPropertiesSet?: string[]; // List of child properties that were set
  affectedChildren?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ConfigureGridLayoutResponsePayload {
  configuredShapes: Array<{ id: string; name?: string }>;
  layoutRemoved?: boolean;
  containerPropertiesSet?: string[];
  childPropertiesSet?: string[];
  affectedChildren?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ConfigureRulerGuidesResponsePayload {
  scope: 'page' | 'board';
  configuredShapes?: Array<{ id: string; name?: string }>;
  guidesAdded?: number;
  guidesRemoved?: number;
  undoInfo?: UndoInfo;
}

export interface ConfigureBoardGuidesResponsePayload {
  configuredShapes: Array<{ id: string; name?: string }>;
  guidesSet?: number;
  undoInfo?: UndoInfo;
}


export type GetSelectionInfoQueryPayload = Record<string, never>;

export interface SelectionInfoItem {
  id: string;
  name?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  guides?: any[]; // For debugging board guides
}

export interface GetSelectionInfoResponsePayload {
  selectionCount: number;
  selectedObjects: SelectionInfoItem[];
}

export interface ExportSelectionAsSvgResponsePayload {
  svgString: string;
  shapeCount: number;
  exportedShapes: Array<{ id: string; name?: string }>;
  fileName?: string;
  includeBackground?: boolean;
  blobUrl?: string;
}



export interface ResizeResponsePayload {
  resizedShapes: Array<{ id: string; name?: string }>;
  scaleFactors: { scaleX?: number; scaleY?: number };
  maintainAspectRatio: boolean;
  undoInfo: UndoInfo;
  // Optional: include read-only selection information for UI display when action cannot
  // proceed (for example, when the director or agent doesn't have GET_SELECTION_INFO).
  currentSelectionInfo?: SelectionInfoItem[];
}

export interface RotateResponsePayload {
  rotatedShapes: Array<{ id: string; name?: string }>;
  angle: number; // Degrees rotated (positive clockwise)
  undoInfo?: UndoInfo;
}

export interface UndoLastActionResponsePayload {
  undoneAction: string; // Description of what was undone
  restoredShapes?: string[]; // Names of shapes that were restored
}

export interface RedoLastActionResponsePayload {
  redoneAction: string; // Description of what was redone
  restoredShapes?: string[]; // Names of shapes that were restored
}

export interface GetUserDataPayload {
  name: string;
  id: string;
}
export interface GetProjectDataPayload {
  name: string;
  id: string;
  pages: {
    name: string;
    id: string;
  }[];
}

export interface GetAvailableFontsPayload {
  fonts: string[];
}

export interface GetCurrentPagePayload {
  name: string;
  id: string;
  shapes: Shape[];
}

export type GetSelectionDumpQueryPayload = Record<string, never>;

export interface GetSelectionDumpResponsePayload {
  selectionCount: number;
  // compact detailed info per selected object — plain serializable fields
  selectedObjects: Array<Record<string, unknown>>;
  // currentSelectionIds mirrors the plugin-side actionSelection tracker (if available)
  currentSelectionIds?: string[];
  // timestamp in ms when dump was taken
  timestamp?: number;
}


export interface GetCurrentThemePayload {
  theme: Theme;
}

export interface ActiveUser {
  id: string;
  name: string;
  avatarUrl?: string; // mapped from Penpot's avatarURL
  color?: string;
}

// Payload for GET_ACTIVE_USERS responses
export interface GetActiveUsersPayload {
  users: ActiveUser[];
}


// Payload for GET_FILE_VERSIONS responses
export interface GetFileVersionsPayload {
  versions: FileVersion[];
  totalVersions: number;
  displayedVersions: number;
  hasMoreVersions: boolean;
}

// Payload for creating a library color
export interface CreateLibraryColorPayload {
  name: string;
  color: string; // hex or other CSS color string
  overwrite?: boolean; // if true, attempt to overwrite existing color
}

export interface CreateLibraryColorResponse {
  id?: string;
  name: string;
  color: string;
}

export interface CreateLibraryColorErrorResponse {
  duplicate: boolean;
  existing: {
    id?: string;
    name: string;
    color: string;
  };
}

// Payload for creating a library font/typography
export interface CreateLibraryFontPayload {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'capitalize' | 'lowercase';
  overwrite?: boolean; // if true, attempt to overwrite existing typography
}

export interface CreateLibraryFontResponse {
  id?: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle?: 'normal' | 'italic';
  lineHeight: string;
  letterSpacing: string;
  textTransform?: 'uppercase' | 'capitalize' | 'lowercase';
}

// Payload for creating a library component
export interface CreateLibraryComponentPayload {
  name: string;
  shapes?: Shape[]; // Optional: array of shapes to use for the component
  useSelection?: boolean; // If true (default), use currently selected shapes instead of provided shapes
  overwrite?: boolean; // if true, attempt to overwrite existing component
}

export interface CreateLibraryComponentResponse {
  id?: string;
  name: string;
  shapes: Shape[];
}

// File version interface (from Penpot API)
export interface FileVersion {
  id?: string;  // Version identifier (may not always be present)
  label: string;
  createdBy?: User;
  createdAt: Date;
  isAutosave: boolean;
}

// include the new payload in the union
export type PluginResponsePayload =
  | GetUserDataPayload
  | GetProjectDataPayload
  | GetAvailableFontsPayload
  | GetCurrentPagePayload
  | GetCurrentThemePayload
  | GetActiveUsersPayload
  | GetFileVersionsPayload
  | CreateLibraryColorResponse
  | CreateLibraryColorErrorResponse
  | CreateLibraryFontResponse
  | CreateLibraryComponentResponse
  | DrawShapeResponsePayload
  | AddImagePayload
  | ApplyBlurResponsePayload
  | ApplyShadowPromptResponsePayload
  | SelectionConfirmationPromptPayload
  | ApplyFillResponsePayload
  | ApplyStrokeResponsePayload
  | ApplyLinearGradientResponsePayload
  | ApplyRadialGradientResponsePayload
  | ApplyShadowResponsePayload
  | SetSelectionOpacityResponsePayload
  | SetSelectionBorderRadiusResponsePayload
  | SetSelectionBlendModeResponsePayload
  | SetSelectionBoundsPromptResponsePayload
  | SetSelectionBoundsResponsePayload
  | AlignHorizontalResponsePayload
  | AlignVerticalResponsePayload
  | CombineShapesResponsePayload
  | IntersectShapesResponsePayload
  | SubtractShapesResponsePayload
  | UnionBooleanOperationResponsePayload
  | IntersectionBooleanOperationResponsePayload
  | DifferenceBooleanOperationResponsePayload
  | ExcludeBooleanOperationResponsePayload
  | FlattenResponsePayload
  | CreateShapeFromSvgResponsePayload
  | ExportSelectionAsSvgResponsePayload
  | UndoLastActionResponsePayload
  | RedoLastActionResponsePayload
  | ResizeResponsePayload
  | RotateResponsePayload
  | GetSelectionInfoResponsePayload
  | MoveResponsePayload
  | CloneSelectionPromptResponsePayload
  | SetSelectionBorderRadiusPromptResponsePayload
  | CloneSelectionResponsePayload
  | ToggleSelectionLockResponsePayload
  | ToggleSelectionVisibilityResponsePayload
  | UngroupResponsePayload
  | GroupResponsePayload
  | FlipSelectionHorizontalResponsePayload
  | FlipSelectionVerticalResponsePayload
  | OpenPageResponsePayload
  | CreatePageResponsePayload
  | ChangePageBackgroundResponsePayload
  | RenamePageResponsePayload
  | BatchCreatePagesResponsePayload
  | BatchCreateComponentsResponsePayload
  | GetColorPaletteResponsePayload
  | UseSizePresetResponsePayload;

// Response for ungrouping shapes
export interface UngroupResponsePayload {
  ungroupedGroups: Array<{
    id: string;
    name: string;
  }>;
}



// Theme type definition
export type Theme = 'light' | 'dark';
export interface ToolBase {
  id: string;
  name: string;
  description: string;
  isUserCreated?: boolean;
  type?: string
}

export interface FunctionTool extends ToolBase {
  inputSchema: ZodType; // Zod schema para validar inputs
  function: Tool['execute']; // Función para tools tipo FUNCTION
  instance?: Tool; // AI SDK tool instance
}

export interface RagTool extends ToolBase {
  ragContentFile: string;
  dbInstance?: AnyOrama; // Database instance for RAG operations
  instance?: Tool; // AI SDK tool instance
}

export interface SpecializedAgent extends ToolBase {
  system: string; // System prompt for the agent
  outputSchema?: ZodType | JSONSchema7; // Zod schema for output validation
  inputSchema?: ZodType | JSONSchema7; // Zod schema for input validation
  toolIds?: string[]; // IDs of tools this agent can use
  specializedAgentIds?: string[]; // IDs of other specialized agents it can call
  imageGenerationAgentIds?: string[]; // IDs of image generation agents it can call
  agentInstance?: Agent<ToolSet, unknown, unknown>;
  instance?: Tool; // AI SDK tool instance
}

export interface ImageGenerationAgent extends ToolBase {
  system: string; // System prompt for the agent
  instance?: Tool; // AI SDK tool instance
}

export interface DirectorAgent extends ToolBase {
  system: string;
  toolIds?: string[]; // IDs de las tools que puede usar
  specializedAgentIds?: string[]; // IDs of specialized agents this agent can use
  imageGenerationAgentIds?: string[]; // IDs of image generation agents this agent can use
  instance?: Agent<ToolSet, unknown, unknown>;
}

/**
 * Message and Conversation types
 */

// Tool call tracking in messages
export interface AgentToolCall {
  toolCallId: string;
  toolName: string;
  state: 'started' | 'success' | 'error';
  input?: unknown;
  output?: unknown;
  error?: string;
  toolCalls?: AgentToolCall[]; // For specialized agents that use other tools
}

// Message interface (used in both V1 and V2)
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: AgentToolCall[];
  hidden?: boolean;
}

// Full conversation with messages (used in V1)
export interface Conversation {
  id: string;
  directorAgentId: string;
  messages: Message[];
  summary: string | null;
  createdAt: Date;
}

// Conversation metadata without messages (used in V2)
// This allows loading conversation list without loading all messages
export interface ConversationMetadata {
  id: string;
  directorAgentId: string;
  summary: string | null;
  createdAt: Date;
  messageCount: number; // Useful to know if conversation has messages
}

// Streaming message (used in V2)
// Represents a message currently being streamed from the AI
export interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
  toolCalls?: AgentToolCall[];
  error?: string;
}


export interface GetCurrentThemeResponsePayload {
  theme: 'light' | 'dark';
}

export interface FileVersion {
  id: string;
  label: string;
  isAutosave: boolean;
  createdAt: string;
}

export interface GetFileVersionsResponsePayload {
  versions: FileVersion[];
}
