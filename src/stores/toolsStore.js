import { atom } from 'nanostores';
import { tool } from 'ai';
import { functionTools, ragTools, drawingTools, iconsTool } from '@/assets/tools';
import { initializeDataBase, searchDataBase } from '@/utils/ragUtils';
import { ToolResponse } from '@/types/types';
import { z } from 'zod';

let toolsInitialized = false;

// Base atom for tools data
export const $toolsData = atom([
  ...functionTools,
  ...ragTools,
  ...drawingTools,
  ...iconsTool,
]);

// Derived functions for getters
export const getToolById = (toolId) => {
  const toolsData = $toolsData.get();
  return toolsData.find(t => t.id === toolId) || null;
};

export const getToolsByIds = (toolIds) => {
  const toolsData = $toolsData.get();
  return toolsData.filter(tool => toolIds.includes(tool.id))
};

// Initialize tools based on their type
const initializeFunctionTool = async (toolDef) => {
  const toolInstance = tool({
    id: toolDef.id,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema,
    execute: toolDef.function,
  });

  return {
    ...toolDef,
    instance: toolInstance,
    type: 'function'
  };
};

const initializeRagTool = async (toolDef) => {
  let dbInstance = null;
  let dbError = null;
  const dbPromise = initializeDataBase(toolDef.ragContentFile, toolDef.embeds)
    .then((db) => {
      dbInstance = db;
      return db;
    })
    .catch((error) => {
      dbError = error;
      throw error;
    });

  const toolInstance = tool({
    id: toolDef.id,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: z.object({
      query: z.string().describe('The search query to find relevant information in the database')
    }),
    execute: async ({ query }) => {
      try {
        if (!dbInstance) {
          dbInstance = await dbPromise;
        }

        const results = await searchDataBase(query, 10, dbInstance, toolDef.embeds);
        
        return {
          ...ToolResponse,
          success: true,
          message: `Found ${results.length || 'no'} relevant sections in the database.`,
          payload: {
            results : results || [],
            query,
          },
        };
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: dbError
            ? 'The knowledge base is still loading or failed to load. Please try again.'
            : 'Sorry, I encountered an error while searching the database. Please try again.',
          payload: {
            error: error instanceof Error ? error.message : 'Unknown error',
            query,
          },
        };
      }
    },
  });

  return {
    ...toolDef,
    dbInstance,
    dbPromise,
    instance: toolInstance,
    type: 'rag'
  };
};

// Action function for initializing tools
export const initializeTools = async () => {
  if (toolsInitialized) {
    return true;
  }

  try {
    // Initialize function tools
    const initializedFunctionTools = await Promise.all(
      [...functionTools, ...drawingTools, ...iconsTool].map(async (toolDef) => {
        try {
          return await initializeFunctionTool(toolDef);
        } catch (error) {
          console.error(`Failed to initialize function tool ${toolDef.id}:`, error);
          return toolDef;
        }
      })
    );

    // Initialize RAG tools
    const initializedRagTools = await Promise.all(
      ragTools.map(async (toolDef) => {
        try {
          return await initializeRagTool(toolDef);
        } catch (error) {
          console.error(`Failed to initialize RAG tool ${toolDef.id}:`, error);
          return toolDef;
        }
      })
    );

    // Combine all tools
    const allTools = [...initializedFunctionTools, ...initializedRagTools];
    
    $toolsData.set(allTools);
    console.log('allTools', allTools);
    toolsInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize tools:', error);
    return false;
  }
};

