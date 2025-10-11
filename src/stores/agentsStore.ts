import { atom, computed } from 'nanostores';
import { Experimental_Agent as Agent } from 'ai';
import agentsConfig from '@/assets/agents.json';
import { $selectedLanguageModel, $isValidatedOpenai, $isConnected } from '@/stores/settingsStore';
import { createModelInstance } from '@/utils/modelUtils';

let modelIdInitialized = '';
export interface Tool {
  id: string;
  type: 'function' | 'rag';
  name: string;
  description: string;
}

export interface SpecializedAgent {
  id: string;
  name: string;
  description: string;
}

export interface DirectorAgent {
  id: string;
  name: string;
  description: string;
  system: string;
  specializedAgents: string[];
  tools: string[];
  instance: Agent<any, any, any> | null;
}

export interface AgentsData {
  directors: DirectorAgent[];
  specializedAgents: SpecializedAgent[];
  tools: Tool[];
}

// Base atoms for agents data
export const $agentsData = atom<AgentsData>({
  ...agentsConfig,
  directors: agentsConfig.directors.map(director => ({
    ...director,
    instance: null
  }))
} as AgentsData);

export const $activeDirectorAgent = atom<string | null>(
  agentsConfig.directors.length > 0 ? agentsConfig.directors[0].id : null
);

// Derived functions for getters
export const getDirectorById = (agentId: string) => {
  const agentsData = $agentsData.get();
  return agentsData.directors.find(d => d.id === agentId);
};

export const getSpecializedAgentById = (agentId: string) => {
  const agentsData = $agentsData.get();
  return agentsData.specializedAgents.find(a => a.id === agentId);
};

export const getToolById = (toolId: string) => {
  const agentsData = $agentsData.get();
  return agentsData.tools.find(t => t.id === toolId);
};

export const getDirectorWithDetails = (agentId: string) => {
  const agentsData = $agentsData.get();
  const director = agentsData.directors.find(d => d.id === agentId);
  
  if (!director) return null;
  
  const specializedAgents = director.specializedAgents
    .map(id => agentsData.specializedAgents.find(a => a.id === id))
    .filter((a): a is SpecializedAgent => a !== undefined);
  
  const tools = director.tools
    .map(id => agentsData.tools.find(t => t.id === id))
    .filter((t): t is Tool => t !== undefined);
  
  return {
    director,
    specializedAgents,
    tools
  };
};

// Action functions
export const setActiveDirectorAgent = (agentId: string) => {
  console.log('setActiveDirectorAgent', agentId);
  $activeDirectorAgent.set(agentId);
};

// Async action function for initializing director agents
export const initializeDirectorAgents = async () => {
  const agentsData = $agentsData.get();
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
    
    const updatedDirectors = agentsData.directors.map(director => {
      try {
        const agentInstance = new Agent({
          model: modelInstance,
          system: director.system
        });
        
        return {
          ...director,
          instance: agentInstance
        };
      } catch (error) {
        console.error(`Failed to initialize agent ${director.id}:`, error);
        return {
          ...director,
          instance: null
        };
      }
    });
    
    $agentsData.set({
      ...agentsData,
      directors: updatedDirectors
    });

    modelIdInitialized = $selectedLanguageModel.get();
    console.log('Director agents initialized', updatedDirectors);
  } catch (error) {
    console.error('Failed to initialize director agents:', error);
  }
};

$selectedLanguageModel.subscribe((newValue, oldValue) => {
  if (newValue !== oldValue) {
    initializeDirectorAgents();
  }
});

$isConnected.subscribe((newValue, oldValue) => {
  if (newValue !== oldValue) {
    initializeDirectorAgents();
  }
});

