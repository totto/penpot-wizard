import { atom } from 'nanostores';
import { tool, Experimental_Agent as Agent, Output, stepCountIs } from 'ai';
import { specializedAgents } from '@/assets/specializedAgents';
import { SpecializedAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
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
    .filter(Boolean); // Remove undefined instances
};

// Initialize a single specialized agent
const initializeSpecializedAgent = async (agentDef: SpecializedAgent): Promise<SpecializedAgent> => {
  const modelInstance = createModelInstance();
  
  // Get tools for this specialized agent
  const agentTools = getToolsByIds(agentDef.toolIds || []);

  // Get other specialized agents this agent can use
  // Note: This creates a potential for circular dependencies, which should be avoided
  const specializedAgentTools = getSpecializedAgentsByIds(agentDef.specializedAgentIds || []);
  
  // Combine all tools
  const allTools = [...agentTools, ...specializedAgentTools];
  
  // Create the Agent instance
  const agentInstance = new Agent({
    model: modelInstance,
    system: agentDef.system,
    tools: allTools.reduce((acc, tool) => {
      acc[tool.id] = tool;
      return acc;
    }, {}) as any,
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
    execute: async ({ query }) => {
      try {
        const result = await agentInstance.generate({ messages: [{ role: 'user', content: query }] });
        return result.text;
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
  if (specializedAgentsInitialized) {
    console.log('Specialized agents already initialized, skipping initialization');
    return;
  }
  
  const isConnected = $isConnected.get();
  if (!isConnected) {
    console.log('Not connected, skipping specialized agents initialization');
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
    console.log('Initialized specialized agents: ', initializedAgents);
    $specializedAgentsData.set(initializedAgents);
    specializedAgentsInitialized = true;
  } catch (error) {
    console.error('Failed to initialize specialized agents:', error);
  }
};

