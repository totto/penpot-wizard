import { atom } from 'nanostores';
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai';
import { directorAgents } from '@/assets/directorAgents';
import { $selectedLanguageModel, $isConnected } from '@/stores/settingsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { DirectorAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { getSpecializedAgentsByIds } from '@/stores/specializedAgentsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { z } from 'zod';

let modelIdInitialized = '';

// Base atoms for agents data
export const $directorAgentsData = atom<DirectorAgent[]>(
  directorAgents.map((director: DirectorAgent) => ({
    ...director,
  }))
);

export const $activeDirectorAgent = atom<string | null>(
  directorAgents.length > 0 ? directorAgents[0].id : null
);

// Derived functions for getters
export const getDirectorById = (agentId: string) => {
  const agentsData = $directorAgentsData.get();
  return agentsData.find(d => d.id === agentId) || null;
};

// Action functions
export const setActiveDirectorAgent = (agentId: string) => {
  $activeDirectorAgent.set(agentId);
};

// Async action function for initializing director agents
export const initializeDirectorAgents = async () => {
  const agentsData = $directorAgentsData.get();
  const isConnected = $isConnected.get();
  if (!isConnected) {
    console.log('Not connected, skipping initialization');
    return;
  }
  if (modelIdInitialized === $selectedLanguageModel.get()) {
    console.log('Model ID already initialized, skipping initialization');
    return;
  }
  try {
    const modelInstance = createModelInstance();
    
    const updatedDirectors = agentsData.map(director => {
      try {
        // Get tools for this director
        const agentTools = getToolsByIds(director.toolIds || []);
        
        // Get specialized agents for this director
        const specializedAgentTools = getSpecializedAgentsByIds(director.specializedAgentIds || []);
        
        // Get image generation agents for this director
        const imageGenerationAgentTools = getImageGenerationAgentsByIds(director.imageGenerationAgentIds || []);
        
        // Combine all tools
        const allTools = [...agentTools, ...specializedAgentTools, ...imageGenerationAgentTools];
        
        const agentInstance = new Agent({
          model: modelInstance,
          system: director.system,
          tools: allTools.reduce((acc, tool) => {
            acc[tool.id] = tool;
            return acc;
          }, {}) as any,
          experimental_output: Output.object({
            schema: z.object({
              text: z.string(),
            }),
          }),
          stopWhen: stepCountIs(20)
        });
        
        return {
          ...director,
          instance: agentInstance
        };
      } catch (error) {
        console.error(`Failed to initialize agent ${director.id}:`, error);
        return {
          ...director,
        };
      }
    });
    
    $directorAgentsData.set(updatedDirectors);

    modelIdInitialized = $selectedLanguageModel.get();
  } catch (error) {
    console.error('Failed to initialize director agents:', error);
  }
};


