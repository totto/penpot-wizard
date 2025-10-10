import { create } from 'zustand';
import { Experimental_Agent as Agent } from 'ai';
import agentsConfig from '../assets/agents.json';
import { useSettingsStore } from './settingsStore';
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

export interface AgentsState {
  agentsData: AgentsData;
  activeDirectorAgent: string | null;
  setActiveDirectorAgent: (agentId: string) => void;
  getDirectorById: (agentId: string) => DirectorAgent | undefined;
  getSpecializedAgentById: (agentId: string) => SpecializedAgent | undefined;
  getToolById: (toolId: string) => Tool | undefined;
  getDirectorWithDetails: (agentId: string) => {
    director: DirectorAgent;
    specializedAgents: SpecializedAgent[];
    tools: Tool[];
  } | null;
  initializeDirectorAgents: () => Promise<void>;
}


export const useAgentsStore = create<AgentsState>((set, get) => ({
  // Initialize with data from JSON, adding instance field to directors
  agentsData: {
    ...agentsConfig,
    directors: agentsConfig.directors.map(director => ({
      ...director,
      instance: null
    }))
  } as AgentsData,
  
  // Set first director as active by default
  activeDirectorAgent: agentsConfig.directors.length > 0 ? agentsConfig.directors[0].id : null,
  
  setActiveDirectorAgent: (agentId: string) => {
    console.log('setActiveDirectorAgent', agentId);
    set({ activeDirectorAgent: agentId });
  },
  
  getDirectorById: (agentId: string) => {
    return get().agentsData.directors.find(d => d.id === agentId);
  },
  
  getSpecializedAgentById: (agentId: string) => {
    return get().agentsData.specializedAgents.find(a => a.id === agentId);
  },
  
  getToolById: (toolId: string) => {
    return get().agentsData.tools.find(t => t.id === toolId);
  },
  
  getDirectorWithDetails: (agentId: string) => {
    const { agentsData } = get();
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
  },

  initializeDirectorAgents: async () => {
    const { agentsData } = get();
    
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
      
      set({
        agentsData: {
          ...agentsData,
          directors: updatedDirectors
        }
      });
      console.log('Director agents initialized', updatedDirectors);
    } catch (error) {
      console.error('Failed to initialize director agents:', error);
    }
  },
}));

useSettingsStore.subscribe(
  (state) => state.selectedLanguageModel,
  (currentModel, previousModel) => {
    // Only reinitialize if the model actually changed and we have a previous value
    if (currentModel !== previousModel ) {
      const agentsStore = useAgentsStore.getState();
      agentsStore.initializeDirectorAgents();
    }
});

if (useSettingsStore.getState().isValidatedOpenai) {
  // Initialize agents when the store is first created
  useAgentsStore.getState().initializeDirectorAgents();
}

