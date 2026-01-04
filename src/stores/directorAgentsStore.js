import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { Experimental_Agent as Agent, stepCountIs } from 'ai';
import { directorAgents } from '@/assets/directorAgents';
import { $selectedLanguageModel, $isConnected } from '@/stores/settingsStore';
import { createModelInstance } from '@/utils/modelUtils';
import { getToolsByIds } from '@/stores/toolsStore';
import { getSpecializedAgentsByIds } from '@/stores/specializedAgentsStore';
import { getImageGenerationAgentsByIds } from '@/stores/imageGenerationAgentsStore';
import { $userDirectorAgents } from '@/stores/userAgentsStore';

let modelIdInitialized = '';

$userDirectorAgents.listen(() => {
  if (!modelIdInitialized) {
    return;
  }
  modelIdInitialized = '';
  initializeDirectorAgents();
});

// Base atoms for predefined agents data
const $predefinedDirectorAgents = atom(
  directorAgents.map((director) => ({
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
export const $directorAgentsData = atom([]);

// Persistent atom for active director agent - saved to localStorage
export const $activeDirectorAgent = persistentAtom(
  'activeDirectorAgent',
  directorAgents.length > 0 ? directorAgents[0].id : null,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// Derived functions for getters
export const getDirectorById = (agentId) => {
  const agentsData = $directorAgentsData.get();
  return agentsData.find(d => d.id === agentId) || null;
};

// Action functions
export const setActiveDirectorAgent = (agentId) => {
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
            acc[tool.id] = tool.instance;
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
    modelIdInitialized = $selectedLanguageModel.get();
    
    // Validate that the active director agent still exists
    const activeAgentId = $activeDirectorAgent.get();
    const activeAgentExists = updatedDirectors.some(agent => agent.id === activeAgentId);
    
    // If the active agent doesn't exist (e.g., was deleted), reset to the first available agent
    if (!activeAgentExists && updatedDirectors.length > 0) {
      $activeDirectorAgent.set(updatedDirectors[0].id);
    }
  } catch (error) {
    console.error('Failed to initialize director agents:', error);
  }
};

