import type { Shape, ImageData as PenpotImageData, User } from '@penpot/plugin-types';
import { PenpotShapeProperties } from './shapeTypes';
import type { UndoInfo } from './types';

// ReadShapeColors Types
export interface ReadShapeColorsQueryPayload {
  shapeIds?: string[];
}

export interface ReadShapeColorsResponsePayload {
  colors: Array<{
    shapeId: string;
    shapeName: string;
    fills: Array<{ color: string; opacity: number; type: string }>;
    strokes: Array<{ color: string; opacity: number; width: number; type: string }>;
  }>;
}

// ReadLibraryContext Types
export interface ReadLibraryContextQueryPayload {
  // No args needed to read current context
}

export interface ReadLibraryContextResponsePayload {
  localLibrary: {
    name: string;
    colorsCount: number;
    typographiesCount: number;
    componentsCount: number;
  };
  connectedLibraries: Array<{
    id: string;
    name: string;
    colorsCount: number;
    typographiesCount: number;
    componentsCount: number;
  }>;
}

// ReadPluginLocalStorage Types
export interface ReadPluginLocalStorageQueryPayload {
  key?: string; // Optional key to read specific data. If omitted, reads all keys.
}

export interface ReadPluginLocalStorageResponsePayload {
  data: Record<string, string>;
}

// ReadViewportSettings Types
export interface ReadViewportSettingsQueryPayload {
  // No args needed
}

export interface ReadViewportSettingsResponsePayload {
  zoom: number;
  center: { x: number; y: number };
}

// UploadMediaData Types
export interface UploadMediaDataQueryPayload {
  url: string; // URL to fetch the image from
  name?: string; // Optional name for the uploaded image
}

export interface UploadMediaDataResponsePayload {
  imageData: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
}

// Shared enums between UI and plugin
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
  GET_SELECTION_DUMP = 'GET_SELECTION_DUMP',
  GET_CURRENT_THEME = 'GET_CURRENT_THEME',
  GET_ACTIVE_USERS = 'GET_ACTIVE_USERS',
  GET_FILE_VERSIONS = 'GET_FILE_VERSIONS',
  CREATE_LIBRARY_COLOR = 'CREATE_LIBRARY_COLOR',
  CREATE_LIBRARY_FONT = 'CREATE_LIBRARY_FONT',
  CREATE_LIBRARY_COMPONENT = 'CREATE_LIBRARY_COMPONENT',
  DRAW_SHAPE = 'DRAW_SHAPE',
  ADD_IMAGE = 'ADD_IMAGE',
  ADD_IMAGE_FROM_URL = 'ADD_IMAGE_FROM_URL',
  APPLY_BLUR = 'APPLY_BLUR',
  SET_SELECTION_OPACITY = 'SET_SELECTION_OPACITY',
  SET_SELECTION_BORDER_RADIUS = 'SET_SELECTION_BORDER_RADIUS',
  SET_SELECTION_BOUNDS = 'SET_SELECTION_BOUNDS',
  SET_SELECTION_BLEND_MODE = 'SET_SELECTION_BLEND_MODE',
  ROTATE = 'ROTATE',
  MOVE = 'MOVE',
  TOGGLE_SELECTION_LOCK = 'TOGGLE_SELECTION_LOCK',
  TOGGLE_SELECTION_PROPORTION_LOCK = 'TOGGLE_SELECTION_PROPORTION_LOCK',
  TOGGLE_SELECTION_VISIBILITY = 'TOGGLE_SELECTION_VISIBILITY',
  CLONE_SELECTION = 'CLONE_SELECTION',
  READ_SHAPE_COLORS = 'READ_SHAPE_COLORS',
  READ_LIBRARY_CONTEXT = 'READ_LIBRARY_CONTEXT',
  READ_PLUGIN_LOCAL_STORAGE = 'READ_PLUGIN_LOCAL_STORAGE',
  READ_VIEWPORT_SETTINGS = 'READ_VIEWPORT_SETTINGS',
  UPLOAD_MEDIA_DATA = 'UPLOAD_MEDIA_DATA',
}

// Plugin-specific enums and types
export enum PenpotShapeType {
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  PATH = 'path',
  TEXT = 'text',
  BOARD = 'board',
}

// Plugin-specific types that can import Penpot types
// These are only used by the plugin code, not the main UI

export type { Shape, PenpotImageData, User };

// Message interfaces
export interface ClientMessage {
  source: MessageSourceName.Client;
  type: ClientQueryType;
  messageId: string;
  payload?: ClientQueryPayload;
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
}

// Plugin-specific payload types
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

export interface SetSelectionOpacityQueryPayload {
  opacity?: number;
}

export interface SetSelectionBorderRadiusQueryPayload {
  borderRadius?: number; // in pixels
}

export interface SetSelectionBoundsQueryPayload {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SetSelectionBlendModeQueryPayload {
  blendMode?: string;
}

export interface RotateQueryPayload {
  angle?: number; // degrees clockwise; if omitted the tool returns read-only selection info
}

export interface MoveQueryPayload {
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
}

export interface CloneSelectionQueryPayload {
  offset?: { x?: number; y?: number };
  skipLocked?: boolean; // if true, skip locked shapes
  keepPosition?: boolean; // if true the clone is placed exactly on the original
  fallback?: 'right' | 'below' | 'grid' | 'auto';
}

export interface ToggleSelectionLockQueryPayload {
  lock?: boolean;
  shapeIds?: string[];
}

export interface ToggleSelectionVisibilityQueryPayload {
  hide?: boolean;
  shapeIds?: string[];
}

export interface CreateLibraryFontPayload {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
  overwrite?: boolean;
}

export interface CreateLibraryComponentPayload {
  name: string;
  shapes?: Shape[]; // Optional: array of shapes to use for the component
  useSelection?: boolean; // Whether to use currently selected shapes
  overwrite?: boolean;
}

// Response payload types
export interface DrawShapeResponsePayload {
  shape: Shape;
}

export interface AddImagePayload {
  newImageData: PenpotImageData;
  shapeId?: string;
}

export interface ApplyBlurResponsePayload {
  blurredShapes: string[];
  blurValue: number;
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

export interface RotateResponsePayload {
  rotatedShapes: string[];
  angle: number; // Degrees rotated (positive clockwise)
  undoInfo?: UndoInfo;
}

export interface MoveResponsePayload {
  movedShapes: string[];
  previousPositions: Array<{ x?: number; y?: number }>;
  newPositions: Array<{ x?: number; y?: number }>;
  skippedLockedIds?: string[];
  skippedLockedNames?: string[];
  undoInfo?: UndoInfo;
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

export interface ToggleSelectionProportionLockQueryPayload {
  // Backwards-compatible: accept either `lock` or `proportionLock` as the intent
  // to turn proportion-lock on/off. Prefer `proportionLock` if both are present.
  lock?: boolean;
  proportionLock?: boolean;
  shapeIds?: string[];
}

export interface ToggleSelectionProportionLockResponsePayload {
  lockedShapes?: Array<{ id: string; name?: string }>;
  unlockedShapes?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
  // Optional snapshot of the affected shapes after toggle (id, name, finalRatioState, remainingRatioFlags)
  selectionSnapshot?: Array<{ id: string; name?: string | undefined; finalRatioLocked: boolean; remainingRatioFlags: Record<string, unknown>; editorLocked?: boolean; editorBlocked?: boolean }>;
}

export interface ToggleSelectionVisibilityResponsePayload {
  hiddenShapes?: Array<{ id: string; name?: string }>;
  unhiddenShapes?: Array<{ id: string; name?: string }>;
  undoInfo?: UndoInfo;
}

export interface ApplyShadowPromptResponsePayload {
  shapesWithExistingShadows: Array<{ id: string; name?: string }>;
  requestedShadow: { shadowColor: string; shadowOffsetX: number; shadowOffsetY: number; shadowBlur: number; shadowSpread: number; shadowStyle?: string };
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
  selectedObjects: Array<Record<string, unknown>>;
  currentSelectionIds?: string[];
  timestamp?: number;
}

export interface GetCurrentThemePayload {
  theme: 'light' | 'dark';
}

export interface ActiveUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

export interface GetActiveUsersPayload {
  users: ActiveUser[];
}

export interface FileVersion {
  id?: string;
  label?: string;
  isAutosave?: boolean;
  createdAt?: string | null;
}

export interface GetFileVersionsPayload {
  versions: FileVersion[];
  totalVersions: number;
  displayedVersions: number;
  hasMoreVersions: boolean;
}

export interface CreateLibraryColorResponse {
  id?: string;
  name: string;
  color: string;
  duplicate?: boolean;
  existing?: {
    id?: string;
    name: string;
    color: string;
  };
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
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
}

export interface CreateLibraryComponentResponse {
  id?: string;
  name: string;
  shapes: Shape[];
}

export interface UngroupResponsePayload {
  ungroupedGroups: Array<{
    id: string;
    name: string;
  }>;
}

export interface GroupResponsePayload {
  groupId: string;
  groupedShapes: Array<{ id: string; name?: string }>;
}

export type ClientQueryPayload =
  | DrawShapeQueryPayload
  | AddImageQueryPayload
  | AddImageFromUrlQueryPayload
  | ApplyBlurQueryPayload
  | SetSelectionOpacityQueryPayload
  | SetSelectionBorderRadiusQueryPayload
  | SetSelectionBlendModeQueryPayload
  | SetSelectionBoundsQueryPayload
  | CreateLibraryFontPayload
  | CreateLibraryFontPayload
  | CreateLibraryComponentPayload
  | CloneSelectionQueryPayload
  | ReadShapeColorsQueryPayload
  | ReadLibraryContextQueryPayload
  | ReadPluginLocalStorageQueryPayload
  | ReadViewportSettingsQueryPayload
  | UploadMediaDataQueryPayload;

export type PluginResponsePayload =
  | DrawShapeResponsePayload
  | AddImagePayload
  | ApplyBlurResponsePayload
  | ApplyShadowResponsePayload
  | SetSelectionOpacityResponsePayload
  | SetSelectionBorderRadiusResponsePayload
  | SetSelectionBlendModeResponsePayload
  | SetSelectionBoundsResponsePayload
  | SetSelectionBoundsPromptResponsePayload
  | SetSelectionBorderRadiusPromptResponsePayload
  | ApplyShadowPromptResponsePayload
  | GetUserDataPayload
  | GetProjectDataPayload
  | GetAvailableFontsPayload
  | GetCurrentPagePayload
  | GetCurrentThemePayload
  | GetActiveUsersPayload
  | GetFileVersionsPayload
  | CreateLibraryColorResponse
  | CreateLibraryFontResponse
  | CreateLibraryComponentResponse
  | UngroupResponsePayload
  | GroupResponsePayload
  | RotateResponsePayload
  | CloneSelectionResponsePayload
  | ReadShapeColorsResponsePayload
  | ReadLibraryContextResponsePayload
  | ReadPluginLocalStorageResponsePayload
  | ReadViewportSettingsResponsePayload;