import { atom } from 'nanostores';
import { tool, Experimental_Agent as Agent, Output, stepCountIs, jsonSchema } from 'ai';
import { specializedAgents as specializedAgentsAssets } from '@/assets/specializedAgents';
import { coordinatorAgents as coordinatorAgentsAssets } from '@/assets/coordinatorAgents';
import { getToolsByIds } from '@/stores/toolsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { z } from 'zod';
import { StreamHandler } from '@/utils/streamingMessageUtils';
import { $userSpecializedAgents } from '@/stores/userAgentsStore';
import { getAbortSignal } from './streamingMessageStore';

let specializedAgentsInitialized = false;

$userSpecializedAgents.listen(() => {
  if (!specializedAgentsInitialized) {
    return;
  }
  specializedAgentsInitialized = false;
  $specializedAgentsData.set(getCombinedSpecializedAgents());
  initializeSpecializedAgents();
});

function getCombinedSpecializedAgents() {
  const predefined = coordinatorAgentsAssets
    .concat(specializedAgentsAssets)
    .map((agent) => ({
      ...agent,
      isUserCreated: false,
    }));

  const userCreated = $userSpecializedAgents.get().map(agent => ({
    ...agent,
    isUserCreated: true,
  }));

  return predefined.concat(userCreated);
}

// Base atom for specialized agents data
export const $specializedAgentsData = atom(getCombinedSpecializedAgents());

// Derived functions for getters
export const getSpecializedAgentById = (agentId) => {
  const agentsData = $specializedAgentsData.get();
  return agentsData.find(a => a.id === agentId) || null;
};

export const getSpecializedAgentsByIds = (agentIds) => {
  const agentsData = $specializedAgentsData.get();
  return agentsData
    .filter(agent => agentIds.includes(agent.id))
};

export const updateSpecializedAgent = (agentDef) => {
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
const initializeSpecializedAgent = async (specializedAgentId) => {
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
      return getSpecializedAgentById(tempAgentDef.id);
    } 
    return tempAgentDef;
  }));

  // Get image generation agents this agent can use
  const imageGenerationAgentTools = getImageGenerationAgentsByIds(specializedAgentDef.imageGenerationAgentIds || []);
  
  // Combine all tools
  const allTools = [...mainTools, ...specializedAgentTools, ...imageGenerationAgentTools];

  const agentOutputSchema = specializedAgentDef.outputSchema ?
    specializedAgentDef.isUserCreated ? jsonSchema(specializedAgentDef.outputSchema) : specializedAgentDef.outputSchema
    : null;

  // Create the Agent instance
  const agentInstance = new Agent({
    model: modelInstance,
    system: specializedAgentDef.system,
    tools: allTools.reduce((acc, tool) => {
      acc[tool.id] = tool.instance;
      return acc;
    }, {}),
    experimental_output: agentOutputSchema ? Output.object({
      schema: agentOutputSchema,
    }) : undefined,
    stopWhen: stepCountIs(20),
  });
  
  const toolInputSchema = specializedAgentDef.inputSchema ?
    specializedAgentDef.isUserCreated ? jsonSchema(specializedAgentDef.inputSchema) : specializedAgentDef.inputSchema
    : z.object({
      query: z.string().describe('The query or task for the specialized agent to process')
    });

  // Wrap the agent in a tool
  const toolInstance = tool({
    id: specializedAgentDef.id,
    name: specializedAgentDef.name,
    description: specializedAgentDef.description,
    inputSchema: toolInputSchema,
    execute: async (input, { toolCallId }) => {
      try {
        // Use streaming to capture nested tool calls
        const abortSignal = getAbortSignal();
        const stream = await agentInstance.stream({ 
          messages: [{ role: 'user', content: JSON.stringify(input) }],
          ...(abortSignal && { abortSignal })
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

