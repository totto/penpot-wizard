import { atom, computed } from 'nanostores';
import { Experimental_Agent as Agent, stepCountIs, Tool, ToolSet } from 'ai';
import { directorAgents } from '@/assets/directorAgents';
import { $selectedLanguageModel, $isConnected } from '@/stores/settingsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { DirectorAgent } from '@/types/types';
import { getToolsByIds } from '@/stores/toolsStore';
import { getSpecializedAgentsByIds } from '@/stores/specializedAgentsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { $userDirectorAgents } from '@/stores/userAgentsStore';

let modelIdInitialized = '';

$userDirectorAgents.listen(() => {
  modelIdInitialized = '';
  initializeDirectorAgents();
});

// Base atoms for predefined agents data
const $predefinedDirectorAgents = atom<DirectorAgent[]>(
  directorAgents.map((director: DirectorAgent) => ({
    ...director,
    isUserCreated: false,
  }))
);

// Computed atom that combines predefined and user-created director agents
const $combinedDirectorAgents = computed(
  [$predefinedDirectorAgents, $userDirectorAgents],
  (predefinedAgents, userAgents) => {
    // Mark user agents with isUserCreated flag
    const markedUserAgents = userAgents.map(agent => ({
      ...agent,
      isUserCreated: true,
    }));
    
    return [...predefinedAgents, ...markedUserAgents];
  }
);

// Atom for initialized agents (with AI instances)
export const $directorAgentsData = atom<DirectorAgent[]>([]);

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
export const initializeDirectorAgents = () => {
  const agentsData = $combinedDirectorAgents.get();
  const isConnected = $isConnected.get();

  if (!isConnected || modelIdInitialized === $selectedLanguageModel.get()) {
    return;
  }
  
  try {
    const modelInstance = createModelInstance();
    
    const updatedDirectors: DirectorAgent[] = agentsData.map(director => {
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
          tools: allTools.reduce((acc: ToolSet, tool) => {
            acc[tool.id] = tool.instance as Tool;
            return acc;
          }, {}),
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
          instance: undefined,
        };
      }
    });
    
    $directorAgentsData.set(updatedDirectors);
    console.log('Director agents initialized:', updatedDirectors);
    modelIdInitialized = $selectedLanguageModel.get();
  } catch (error) {
    console.error('Failed to initialize director agents:', error);
  }
};


