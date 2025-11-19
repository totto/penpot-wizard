import type { Shape, ImageData as PenpotImageData, User } from '@penpot/plugin-types';
import { PenpotShapeProperties } from './shapeTypes';
import type { UndoInfo } from './types';

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
  ROTATE = 'ROTATE',
  MOVE = 'MOVE',
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

export interface RotateQueryPayload {
  angle?: number; // degrees clockwise; if omitted the tool returns read-only selection info
}

export interface MoveQueryPayload {
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
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

export interface RotateResponsePayload {
  rotatedShapes: string[];
  angle: number; // Degrees rotated (positive clockwise)
  undoInfo?: UndoInfo;
}

export interface MoveResponsePayload {
  movedShapes: string[];
  previousPositions: Array<{ x?: number; y?: number }>;
  newPositions: Array<{ x?: number; y?: number }>;
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

export type ClientQueryPayload = DrawShapeQueryPayload | AddImageQueryPayload | AddImageFromUrlQueryPayload | ApplyBlurQueryPayload | CreateLibraryFontPayload | CreateLibraryComponentPayload;

export type PluginResponsePayload = 
DrawShapeResponsePayload 
| AddImagePayload 
| ApplyBlurResponsePayload 
| ApplyShadowResponsePayload 
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
| RotateResponsePayload;