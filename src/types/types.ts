import { AnyOrama } from '@orama/orama';
import { Experimental_Agent as Agent } from 'ai';
import { z } from 'zod';

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
// Enum for messages sent from the plugin to the Penpot app
export enum PluginResponseType {
  DRAW_SHAPE_RESPONSE = 'DRAW_SHAPE_RESPONSE',
  GET_USER_DATA_RESPONSE = 'GET_USER_DATA_RESPONSE',
  GET_PROJECT_DATA_RESPONSE = 'GET_PROJECT_DATA_RESPONSE',
  GET_AVAILABLE_FONTS_RESPONSE = 'GET_AVAILABLE_FONTS_RESPONSE',
}

// Enum for messages sent from the Penpot app to the plugin
export enum ClientQueryType {
  GET_USER_DATA = 'GET_USER_DATA',
  GET_PROJECT_DATA = 'GET_PROJECT_DATA',
  DRAW_SHAPE = 'DRAW_SHAPE',
}

export enum PenpotShapeType {
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  PATH = 'path',
  TEXT = 'text',
  BOARD = 'board',
}

export interface ClientQueryMessage {
  source: MessageSourceName.Client;
  type: ClientQueryType;
  callId: string;
  payload?: any;
}

export interface PluginResponsePayload {
  success: boolean;
  description: string;
  data?: any;
}
export interface PluginResponseMessage {
  source: MessageSourceName.Plugin;
  queryType: ClientQueryType;
  callId: string;
  payload: PluginResponsePayload;
}

// Theme type definition
export type Theme = 'light' | 'dark';
export interface FunctionTool {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>; // Zod schema para validar inputs
  function: (input: any) => any | Promise<any>; // Función para tools tipo FUNCTION
  instance?: any; // AI SDK tool instance
}

export interface RagTool {
  id: string;
  name: string;
  description: string;
  ragContentFile: string;
  dbInstance?: AnyOrama; // Database instance for RAG operations
  instance?: any; // AI SDK tool instance
}

export interface SpecializedAgent {
  id: string;
  name: string;
  description: string;
  system: string; // System prompt for the agent
  outputSchema?: z.ZodObject<any>; // Zod schema for output validation
  toolIds?: string[]; // IDs of tools this agent can use
  specializedAgentIds?: string[]; // IDs of other specialized agents this agent can use
  instance?: any; // AI SDK tool instance
}

export interface DirectorAgent {
  id: string;
  name: string;
  description: string;
  system: string;
  toolIds?: string[]; // IDs de las tools que puede usar
  specializedAgentIds?: string[]; // IDs of specialized agents this agent can use
  instance?: Agent<any, any, any>;
}

/**
 * Message and Conversation types
 */

// Message interface (used in both V1 and V2)
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
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
}

