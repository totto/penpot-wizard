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
  GET_CURRENT_SELECTION = 'GET_CURRENT_SELECTION',
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
  UNDO_LAST_ACTION = 'UNDO_LAST_ACTION',
  REDO_LAST_ACTION = 'REDO_LAST_ACTION',
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
  payload?: DrawShapeQueryPayload | AddImageQueryPayload | AddImageFromUrlQueryPayload | ApplyBlurQueryPayload | ApplyFillQueryPayload | ApplyStrokeQueryPayload | ApplyLinearGradientQueryPayload | ApplyRadialGradientQueryPayload | ApplyShadowQueryPayload | AlignHorizontalQueryPayload | AlignVerticalQueryPayload | CenterAlignmentQueryPayload | DistributeHorizontalQueryPayload | DistributeVerticalQueryPayload | GroupQueryPayload | UngroupQueryPayload | UnionBooleanOperationQueryPayload | IntersectionBooleanOperationQueryPayload | DifferenceBooleanOperationQueryPayload | ExcludeBooleanOperationQueryPayload | UndoLastActionQueryPayload | RedoLastActionQueryPayload;
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

export interface UndoLastActionQueryPayload {
  actionId?: string; // Optional: specify which action to undo, otherwise undo the last one
}

export interface RedoLastActionQueryPayload {
  actionId?: string; // Optional: specify which action to redo, otherwise redo the last undone one
}

export type ClientQueryPayload = DrawShapeQueryPayload | AddImageQueryPayload | AddImageFromUrlQueryPayload | ApplyBlurQueryPayload | ApplyFillQueryPayload | ApplyStrokeQueryPayload | ApplyLinearGradientQueryPayload | ApplyRadialGradientQueryPayload | ApplyShadowQueryPayload | AlignHorizontalQueryPayload | AlignVerticalQueryPayload | CenterAlignmentQueryPayload | DistributeHorizontalQueryPayload | DistributeVerticalQueryPayload | GroupQueryPayload | UngroupQueryPayload | UndoLastActionQueryPayload | RedoLastActionQueryPayload;

// Undo system interfaces
export interface UndoInfo {
  actionType: ClientQueryType; // What type of action was performed
  actionId: string; // Unique ID for this action (for tracking)
  description: string; // Human-readable description of what will be undone
  undoData: Record<string, unknown>; // Data needed to perform the undo
  timestamp: number; // When the action was performed
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
  undoInfo?: UndoInfo;
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

// Payload for GET_CURRENT_SELECTION responses
export interface SelectedItem {
  id: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface GetCurrentSelectionPayload {
  items: SelectedItem[];
  count: number;
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
  | GetCurrentSelectionPayload
  | CreateLibraryColorResponse
  | CreateLibraryColorErrorResponse
  | CreateLibraryFontResponse
  | CreateLibraryComponentResponse
  | DrawShapeResponsePayload
  | AddImagePayload
  | ApplyBlurResponsePayload
  | ApplyFillResponsePayload
  | ApplyStrokeResponsePayload
  | ApplyLinearGradientResponsePayload
  | ApplyRadialGradientResponsePayload
  | ApplyShadowResponsePayload
  | AlignHorizontalResponsePayload
  | AlignVerticalResponsePayload
  | CombineShapesResponsePayload
  | IntersectShapesResponsePayload
  | SubtractShapesResponsePayload
  | UnionBooleanOperationResponsePayload
  | IntersectionBooleanOperationResponsePayload
  | DifferenceBooleanOperationResponsePayload
  | ExcludeBooleanOperationResponsePayload
  | UndoLastActionResponsePayload
  | RedoLastActionResponsePayload;



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

