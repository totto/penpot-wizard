import { atom } from 'nanostores';
import { tool, Experimental_Agent as Agent, Output, stepCountIs, Tool, ToolSet, jsonSchema, JSONSchema7 } from 'ai';
import { specializedAgents as specializedAgentsAssets } from '@/assets/specializedAgents';
import { coordinatorAgents as coordinatorAgentsAssets } from '@/assets/coordinatorAgents';
import { SpecializedAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { z, ZodType } from 'zod';
import { StreamHandler } from '@/utils/streamingMessageUtils';
import { $userSpecializedAgents } from '@/stores/userAgentsStore';

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
  const predefined = (coordinatorAgentsAssets as SpecializedAgent[])
    .concat(specializedAgentsAssets as SpecializedAgent[])
    .map((agent: SpecializedAgent) => ({
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
export const $specializedAgentsData = atom<SpecializedAgent[]>(getCombinedSpecializedAgents());

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

  const agentOutputSchema = specializedAgentDef.outputSchema ?
    specializedAgentDef.isUserCreated ? jsonSchema(specializedAgentDef.outputSchema as JSONSchema7) : specializedAgentDef.outputSchema as ZodType
    : null;

  // Create the Agent instance
  const agentInstance = new Agent({
    model: modelInstance,
    system: specializedAgentDef.system,
    tools: allTools.reduce((acc: ToolSet, tool) => {
      acc[tool.id] = tool.instance as Tool;
      return acc;
    }, {}),
    experimental_output: agentOutputSchema ? Output.object({
      schema: agentOutputSchema,
    }) : undefined,
    stopWhen: stepCountIs(20),
  });
  
  const toolInputSchema = specializedAgentDef.inputSchema ?
    specializedAgentDef.isUserCreated ? jsonSchema(specializedAgentDef.inputSchema as JSONSchema7) : specializedAgentDef.inputSchema as ZodType
    : z.object({
      query: z.string().describe('The query or task for the specialized agent to process')
    });

  // Wrap the agent in a tool
  const toolInstance = tool({
    id: specializedAgentDef.id as `${string}.${string}`,
    name: specializedAgentDef.name,
    description: specializedAgentDef.description,
    inputSchema: toolInputSchema,
    execute: async (input, { toolCallId }) => {
      try {
        //const context = 
        // Use streaming to capture nested tool calls
        const stream = await agentInstance.stream({ 
          messages: [{ role: 'user', content: JSON.stringify(input) }]
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
    console.log('Specialized agents initialized:', $specializedAgentsData.get());
  } catch (error) {
    console.error('Failed to initialize specialized agents:', error);
  }
};

