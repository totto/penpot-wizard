import { atom } from 'nanostores';
import { tool, Experimental_Agent as Agent, Output, stepCountIs, Tool, ToolSet } from 'ai';
import { specializedAgents } from '@/assets/specializedAgents';
import { SpecializedAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { handleNestedStreamProcessing } from '@/utils/nestedStreamingUtils';
import { z } from 'zod';

let specializedAgentsInitialized = false;

// Base atom for specialized agents data
export const $specializedAgentsData = atom<SpecializedAgent[]>(
  specializedAgents.map((agent: SpecializedAgent) => ({
    ...agent,
  }))
);

// Derived functions for getters
export const getSpecializedAgentById = (agentId: string) => {
  const agentsData = $specializedAgentsData.get();
  return agentsData.find(a => a.id === agentId) || null;
};

export const getSpecializedAgentsByIds = (agentIds: string[]) => {
  const agentsData = $specializedAgentsData.get();
  return agentsData
    .filter(agent => agentIds.includes(agent.id))
    .map(agent => agent.instance)
    .filter(Boolean) as Tool[]; // Remove undefined instances
};

// Initialize a single specialized agent
const initializeSpecializedAgent = async (agentDef: SpecializedAgent): Promise<SpecializedAgent> => {
  const modelInstance = createModelInstance();
  
  // Get tools for this specialized agent
  const agentTools = getToolsByIds(agentDef.toolIds || []);

  // Get other specialized agents this agent can use
  // Note: This creates a potential for circular dependencies, which should be avoided
  const specializedAgentTools = getSpecializedAgentsByIds(agentDef.specializedAgentIds || []);
  
  // Get image generation agents this agent can use
  const imageGenerationAgentTools = getImageGenerationAgentsByIds(agentDef.imageGenerationAgentIds || []);
  
  // Combine all tools
  const allTools: Tool[] = [...agentTools, ...specializedAgentTools, ...imageGenerationAgentTools];
  
  // Create the Agent instance
  const agentInstance = new Agent({
    model: modelInstance,
    system: agentDef.system,
    tools: allTools.reduce((acc: ToolSet, tool: Tool) => {
      acc[tool.id] = tool;
      return acc;
    }, {}),
    experimental_output: agentDef.outputSchema ? Output.object({
      schema: agentDef.outputSchema,
    }) : undefined,
    stopWhen: stepCountIs(20)
  });
  
  // Wrap the agent in a tool
  const toolInstance = tool({
    id: agentDef.id as `${string}.${string}`,
    name: agentDef.name,
    description: agentDef.description,
    inputSchema: z.object({
      query: z.string().describe('The query or task for the specialized agent to process')
    }),
    execute: async ({ query }, { toolCallId }) => {
      try {
        // Use streaming to capture nested tool calls
        const stream = await agentInstance.stream({ 
          messages: [{ role: 'user', content: query }] 
        });
        
        // Process the stream and capture nested tool calls
        const fullResponse = await handleNestedStreamProcessing(
          stream.fullStream, 
          toolCallId
        );
        
        // Return the complete response
        return fullResponse;
      } catch (error) {
        console.error(`Error executing specialized agent ${agentDef.id}:`, error);
        throw error;
      }
    },
  });
  
  return {
    ...agentDef,
    instance: toolInstance
  };
};

// Action function for initializing specialized agents
export const initializeSpecializedAgents = async () => {
  if (specializedAgentsInitialized || !$isConnected.get()) {
    return;
  }
    
  try {
    const agentsData = $specializedAgentsData.get();
    
    // Initialize all specialized agents
    const initializedAgents = await Promise.all(
      agentsData.map(async (agentDef) => {
        try {
          return await initializeSpecializedAgent(agentDef);
        } catch (error) {
          console.error(`Failed to initialize specialized agent ${agentDef.id}:`, error);
          return agentDef;
        }
      })
    );

    $specializedAgentsData.set(initializedAgents);
    specializedAgentsInitialized = true;

  } catch (error) {
    console.error('Failed to initialize specialized agents:', error);
  }
};

