import { AnyOrama } from '@orama/orama';
import { Experimental_Agent as Agent } from 'ai';
import { z } from 'zod';

/**
 * Message types for communication between Penpot plugin and app
 */

// Enum for messages sent from the plugin to the Penpot app
export enum PluginToAppMessage {
  THEME_CHANGE = 'THEME_CHANGE',
  // Add other message types as needed
}

// Enum for messages sent from the Penpot app to the plugin
export enum AppToPluginMessage {
  // Add other message types as needed
}

// Theme type definition
export type Theme = 'light' | 'dark';

export interface UserData {
  id: string;
  name: string;
}

export interface ProjectData {
  id: string;
  name: string;
}

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

