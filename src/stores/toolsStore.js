import { atom } from 'nanostores';
import { tool } from 'ai';
import { functionTools, ragTools, ragToolsV2, drawingTools, iconsTool } from '@/assets/tools';
import { initializeDataBase, searchDataBase } from '@/utils/ragUtils';
import { initializeDataBaseV2, searchDataBaseV2 } from '@/utils/ragUtilsV2';
import { ToolResponse } from '@/types/types';
import { z } from 'zod';
import { $openrouterApiKey } from '@/stores/settingsStore';

let toolsInitialized = false;

// Base atom for tools data
export const $toolsData = atom([
  ...functionTools,
  ...ragTools,
  ...ragToolsV2,
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
  const toolInstance = tool({
    id: toolDef.id,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: z.object({
      query: z.string().describe('The search query to find relevant information in the database')
    }),
    execute: async ({ query }) => {
      try {
        const dbInstance = await initializeDataBase(toolDef.ragContentFile, toolDef.embeds);
        const results = await searchDataBase(query, 10, dbInstance, toolDef.embeds);

        return {
          ...ToolResponse,
          success: true,
          message: `Found ${results.length || 'no'} relevant sections in the database.`,
          payload: {
            results: results || [],
            query,
          },
        };
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: 'Sorry, I encountered an error while searching the database. Please try again.',
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
    instance: toolInstance,
    type: 'rag'
  };
};

const initializeRagToolV2 = async (toolDef) => {
  const inputSchema = toolDef.inputSchema || z.object({
    query: z.string().describe('The search query to find relevant information in the database')
  });

  const toolInstance = tool({
    id: toolDef.id,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema,
    execute: async (input) => {
      const { query } = input || {};
      try {
        const ragFile = typeof toolDef.getRagContentFile === 'function'
          ? toolDef.getRagContentFile(input)
          : toolDef.ragContentFile;

        if (!ragFile) {
          throw new Error('Missing ragContentFile.');
        }

        const dbInstance = await initializeDataBaseV2(ragFile);
        const apiKey = $openrouterApiKey.get();
        const results = await searchDataBaseV2(query, {
          dbInstance,
          apiKey,
          modelId: toolDef.modelId,
          limit: toolDef.limit,
          similarity: toolDef.similarity
        });

        return {
          ...ToolResponse,
          success: true,
          message: `Found ${results.length || 'no'} relevant sections in the database.`,
          payload: {
            results: results || [],
            query,
          },
        };
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: 'Sorry, I encountered an error while searching the database. Please try again.',
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
    instance: toolInstance,
    type: 'rag-v2'
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

    const initializedRagToolsV2 = await Promise.all(
      ragToolsV2.map(async (toolDef) => {
        try {
          return await initializeRagToolV2(toolDef);
        } catch (error) {
          console.error(`Failed to initialize RAG v2 tool ${toolDef.id}:`, error);
          return toolDef;
        }
      })
    );

    // Combine all tools
    const allTools = [
      ...initializedFunctionTools,
      ...initializedRagTools,
      ...initializedRagToolsV2
    ];
    
    $toolsData.set(allTools);
    toolsInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize tools:', error);
    return false;
  }
};

