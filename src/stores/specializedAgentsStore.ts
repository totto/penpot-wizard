import { atom } from 'nanostores';
import { tool, Experimental_Agent as Agent, Output, stepCountIs, Tool, ToolSet } from 'ai';
import { specializedAgents } from '@/assets/specializedAgents';
import { SpecializedAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { z } from 'zod';
import { StreamHandler } from '@/utils/streamingMessageUtils';

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
};

export const updateSpecializedAgent = (agentDef: SpecializedAgent) => {
  const agentsData = $specializedAgentsData.get();
  const updatedAgents = agentsData.map(agent => {
    if (agent.id === agentDef.id) {
      return agentDef;
    }
    return agent;
  });
  $specializedAgentsData.set(updatedAgents);
};

// Initialize a single specialized agent
const initializeSpecializedAgent = async (specializedAgentId: string): Promise<boolean> => {
  const specializedAgentDef = getSpecializedAgentById(specializedAgentId);
  
  if (!specializedAgentDef) {
    console.error(`Specialized agent ${specializedAgentId} not found`);
    return false;
  }

  if (specializedAgentDef.instance) {
    return true;
  }

  const modelInstance = createModelInstance();
  
  // Get tools for this specialized agent
  const mainTools = getToolsByIds(specializedAgentDef.toolIds || []);

  // Get other specialized agents this agent can use
  // Note: This creates a potential for circular dependencies, which should be avoided
  const specializedAgentTools = await Promise.all(getSpecializedAgentsByIds(specializedAgentDef.specializedAgentIds || []).map(async (tempAgentDef) => {
    if (!tempAgentDef.instance) {
      await initializeSpecializedAgent(tempAgentDef.id);
      return getSpecializedAgentById(tempAgentDef.id) as SpecializedAgent;
    } 
    return tempAgentDef;
  }));

  // Get image generation agents this agent can use
  const imageGenerationAgentTools = getImageGenerationAgentsByIds(specializedAgentDef.imageGenerationAgentIds || []);
  
  // Combine all tools
  const allTools = [...mainTools, ...specializedAgentTools, ...imageGenerationAgentTools];

  // Create the Agent instance
  const agentInstance = new Agent({
    model: modelInstance,
    system: specializedAgentDef.system,
    tools: allTools.reduce((acc: ToolSet, tool) => {
      acc[tool.id] = tool.instance as Tool;
      return acc;
    }, {}),
    experimental_output: specializedAgentDef.outputSchema ? Output.object({
      schema: specializedAgentDef.outputSchema,
    }) : undefined,
    stopWhen: stepCountIs(20)
  });
  
  // Wrap the agent in a tool
  const toolInstance = tool({
    id: specializedAgentDef.id as `${string}.${string}`,
    name: specializedAgentDef.name,
    description: specializedAgentDef.description,
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
        const streamHandler = new StreamHandler(stream.fullStream, toolCallId);
        const fullResponse = await streamHandler.handleStream();

        return fullResponse;
      } catch (error) {
        console.error(`Error executing specialized agent ${specializedAgentDef.id}:`, error);
        throw error;
      }
    },
  });
  
  const updatedAgentDef = {
    ...specializedAgentDef,
    instance: toolInstance,
    agentInstance: agentInstance
  };

  updateSpecializedAgent(updatedAgentDef);
  return true;
};

// Action function for initializing specialized agents
export const initializeSpecializedAgents = async () => {
  if (specializedAgentsInitialized || !$isConnected.get()) {
    return;
  }
    
  try {
    const agentsData = $specializedAgentsData.get();
    
    for (const agentDef of agentsData) {
      await initializeSpecializedAgent(agentDef.id);
    }

    specializedAgentsInitialized = true;
  } catch (error) {
    console.error('Failed to initialize specialized agents:', error);
  }
};

