import { AnyOrama } from '@orama/orama';
import { Experimental_Agent as Agent, Tool, ToolSet } from 'ai';
import { ZodType } from 'zod';
import type { Shape, ImageData as PenpotImageData } from '@penpot/plugin-types';
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
  DRAW_SHAPE = 'DRAW_SHAPE',
  ADD_IMAGE = 'ADD_IMAGE',
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
  payload?: DrawShapeQueryPayload | AddImageQueryPayload;
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

export type ClientQueryPayload = DrawShapeQueryPayload | AddImageQueryPayload;
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

export interface DrawShapeResponsePayload {
  shape: Shape;
}
export interface AddImagePayload {
  newImageData: PenpotImageData;
}
export interface GetUserDataPayload {
  name: string;
  id: string;
}
export interface GetProjectDataPayload {
  project: {
    name: string;
    id: string;
    pages: {
      name: string;
      id: string;
    }[];
  };
  availableFonts: {
    name: string;
    fontId: string;
    fontFamily: string;
  }[];
  currentPage: {
    name: string;
    id: string;
    shapes: Shape[];
  };
}

export type PluginResponsePayload = GetUserDataPayload | GetProjectDataPayload | DrawShapeResponsePayload | AddImagePayload;

// Theme type definition
export type Theme = 'light' | 'dark';
export interface FunctionTool {
  id: string;
  name: string;
  description: string;
  inputSchema: ZodType; // Zod schema para validar inputs
  function: Tool['execute']; // Función para tools tipo FUNCTION
  instance?: Tool; // AI SDK tool instance
}

export interface RagTool {
  id: string;
  name: string;
  description: string;
  ragContentFile: string;
  dbInstance?: AnyOrama; // Database instance for RAG operations
  instance?: Tool; // AI SDK tool instance
}

export interface SpecializedAgent {
  id: string;
  name: string;
  description: string;
  system: string; // System prompt for the agent
  outputSchema?: ZodType; // Zod schema for output validation
  toolIds?: string[]; // IDs of tools this agent can use
  specializedAgentIds?: string[]; // IDs of other specialized agents this agent can use
  imageGenerationAgentIds?: string[]; // IDs of image generation agents this agent can use
  instance?: Tool; // AI SDK tool instance
}

export interface ImageGenerationAgent {
  id: string;
  name: string;
  description: string;
  system: string; // System prompt for the agent
  instance?: Tool; // AI SDK tool instance
}

export interface DirectorAgent {
  id: string;
  name: string;
  description: string;
  system: string;
  toolIds?: string[]; // IDs de las tools que puede usar
  specializedAgentIds?: string[]; // IDs of specialized agents this agent can use
  imageGenerationAgentIds?: string[]; // IDs of image generation agents this agent can use
  instance?: Agent<ToolSet>;
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
  nestedToolCalls?: AgentToolCall[]; // For specialized agents that use other tools
}

// Message interface (used in both V1 and V2)
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: AgentToolCall[];
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

