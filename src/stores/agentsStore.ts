import { atom, getDefaultStore } from 'jotai';
import { Experimental_Agent as Agent } from 'ai';
import agentsConfig from '../assets/agents.json';
import { selectedLanguageModelAtom, isValidatedOpenaiAtom, isConnectedAtom } from './settingsStore';
import { createModelInstance } from '../utils/modelUtils';

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
const agentsDataAtom = atom<AgentsData>({
  ...agentsConfig,
  directors: agentsConfig.directors.map(director => ({
    ...director,
    instance: null
  }))
} as AgentsData);

const activeDirectorAgentAtom = atom<string | null>(
  agentsConfig.directors.length > 0 ? agentsConfig.directors[0].id : null
);

// Derived atoms for getters
export const getDirectorByIdAtom = atom((get) => (agentId: string) => {
  const agentsData = get(agentsDataAtom);
  return agentsData.directors.find(d => d.id === agentId);
});

export const getSpecializedAgentByIdAtom = atom((get) => (agentId: string) => {
  const agentsData = get(agentsDataAtom);
  return agentsData.specializedAgents.find(a => a.id === agentId);
});

export const getToolByIdAtom = atom((get) => (toolId: string) => {
  const agentsData = get(agentsDataAtom);
  return agentsData.tools.find(t => t.id === toolId);
});

export const getDirectorWithDetailsAtom = atom((get) => (agentId: string) => {
  const agentsData = get(agentsDataAtom);
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
});

// Action atoms
export const setActiveDirectorAgentAtom = atom(
  null,
  (get, set, agentId: string) => {
    console.log('setActiveDirectorAgent', agentId);
    set(activeDirectorAgentAtom, agentId);
  }
);

// Async action atom for initializing director agents
export const initializeDirectorAgentsAtom = atom(
  null,
  async (get, set) => {
    const agentsData = get(agentsDataAtom);
    const isConnected = get(isConnectedAtom);
    if (!isConnected) {
      console.log('Not connected, skipping initialization');
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
      
      set(agentsDataAtom, {
        ...agentsData,
        directors: updatedDirectors
      });
      console.log('Director agents initialized', updatedDirectors);
    } catch (error) {
      console.error('Failed to initialize director agents:', error);
    }
  }
);

// Function to check and handle model changes
// Set up subscriptions
const store = getDefaultStore();

// Subscribe to model changes
store.sub(selectedLanguageModelAtom, () => {
  store.set(initializeDirectorAgentsAtom);
});

// Subscribe to validation changes
store.sub(isValidatedOpenaiAtom, () => {
  store.set(initializeDirectorAgentsAtom);
});

store.sub(isConnectedAtom, () => {
  store.set(initializeDirectorAgentsAtom);
});

// Export all atoms for use in components
export {
  agentsDataAtom,
  activeDirectorAgentAtom,
};

