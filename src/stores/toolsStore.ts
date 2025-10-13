import { atom } from 'nanostores';
import { tool } from 'ai';
import { functionTools, ragTools } from '@/assets/tools';
import { FunctionTool, RagTool } from '@/types/types';
import { initializeDataBase, searchDataBase } from '@/utils/ragUtils';
import z from 'zod';

let toolsInitialized = false;

// Base atom for tools data
export const $toolsData = atom<(FunctionTool | RagTool)[]>([
  ...functionTools,
  ...ragTools
]);

// Derived functions for getters
export const getToolById = (toolId: string) => {
  const toolsData = $toolsData.get();
  return toolsData.find(t => t.id === toolId) || null;
};

export const getToolsByIds = (toolIds: string[]) => {
  const toolsData = $toolsData.get();
  return toolsData
    .filter(tool => toolIds.includes(tool.id))
    .map(tool => tool.instance)
    .filter(Boolean); // Remove undefined instances
};

// Initialize tools based on their type
const initializeFunctionTool = async (toolDef: FunctionTool): Promise<FunctionTool> => {
  const toolInstance = tool({
    id: toolDef.id as `${string}.${string}`,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema,
    execute: toolDef.function as any,
  });

  return {
    ...toolDef,
    instance: toolInstance
  };
};

const initializeRagTool = async (toolDef: RagTool): Promise<RagTool> => {
  // Initialize the database instance
  const dbInstance = await initializeDataBase(toolDef.ragContentFile);

  const toolInstance = tool({
    id: toolDef.id as `${string}.${string}`,
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: z.object({
      query: z.string().describe('The search query to find relevant information in the database')
    }),
    execute: async ({ query }) => {
      try {
        const results = await searchDataBase(query, 10, dbInstance);
        
        if (results.length === 0) {
          return {
            success: true,
            message: 'No relevant information found in the database for your query.',
            results: [],
            query
          };
        }
        
        // Format results for the agent
        const formattedResults = results.map((result, index) => ({
          rank: index + 1,
          title: result.heading,
          summary: result.summary,
          content: result.text,
          url: result.url,
          source: result.sourcePath,
          breadcrumbs: result.breadcrumbs,
          relevanceScore: result.score,
          hasCode: result.hasCode,
          codeLanguages: result.codeLangs
        }));
        
        return {
          success: true,
          message: `Found ${results.length} relevant sections in the database.`,
          results: formattedResults,
          query,
          totalResults: results.length
        };
        
      } catch (error) {
        console.error('Error in RAG tool:', error);
        
        return {
          success: false,
          message: 'Sorry, I encountered an error while searching the database. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error',
          query
        };
      }
    },
  });

  return {
    ...toolDef,
    dbInstance,
    instance: toolInstance
  };
};

// Action function for initializing tools
export const initializeTools = async () => {
  if (toolsInitialized) {
    console.log('Tools already initialized, skipping initialization');
    return;
  }

  try {
    // Initialize function tools
    const initializedFunctionTools = await Promise.all(
      functionTools.map(async (toolDef) => {
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
    toolsInitialized = true;
  } catch (error) {
    console.error('Failed to initialize tools:', error);
  }
};
