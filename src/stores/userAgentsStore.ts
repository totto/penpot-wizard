import { persistentAtom } from '@nanostores/persistent';
import { DirectorAgent, SpecializedAgent } from '@/types/types';

// Persistent atoms for user-created agents
export const $userDirectorAgents = persistentAtom<DirectorAgent[]>('userDirectorAgents', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const $userSpecializedAgents = persistentAtom<SpecializedAgent[]>('userSpecializedAgents', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Director Agents CRUD functions
export const createUserDirectorAgent = (agent: DirectorAgent) => {
  const currentAgents = $userDirectorAgents.get();
  // Check if agent with same id already exists
  if (currentAgents.some(a => a.id === agent.id)) {
    throw new Error(`Director agent with id "${agent.id}" already exists`);
  }
  $userDirectorAgents.set([...currentAgents, agent]);
};

export const getUserDirectorAgents = (): DirectorAgent[] => {
  return $userDirectorAgents.get();
};

export const getUserDirectorAgentById = (id: string): DirectorAgent | null => {
  const agents = $userDirectorAgents.get();
  return agents.find(agent => agent.id === id) || null;
};

export const updateUserDirectorAgent = (agent: DirectorAgent) => {
  const currentAgents = $userDirectorAgents.get();
  const updatedAgents = currentAgents.map(a => 
    a.id === agent.id ? agent : a
  );
  
  // Check if agent was found and updated
  if (!currentAgents.some(a => a.id === agent.id)) {
    throw new Error(`Director agent with id "${agent.id}" not found`);
  }
  
  $userDirectorAgents.set(updatedAgents);
};

export const deleteUserDirectorAgent = (id: string) => {
  const currentAgents = $userDirectorAgents.get();
  const filteredAgents = currentAgents.filter(a => a.id !== id);
  
  // Check if agent was found and removed
  if (filteredAgents.length === currentAgents.length) {
    throw new Error(`Director agent with id "${id}" not found`);
  }
  
  $userDirectorAgents.set(filteredAgents);
};

// Specialized Agents CRUD functions
export const createUserSpecializedAgent = (agent: SpecializedAgent) => {
  const currentAgents = $userSpecializedAgents.get();
  // Check if agent with same id already exists
  if (currentAgents.some(a => a.id === agent.id)) {
    throw new Error(`Specialized agent with id "${agent.id}" already exists`);
  }
  $userSpecializedAgents.set([...currentAgents, agent]);
};

export const getUserSpecializedAgents = (): SpecializedAgent[] => {
  return $userSpecializedAgents.get();
};

export const getUserSpecializedAgentById = (id: string): SpecializedAgent | null => {
  const agents = $userSpecializedAgents.get();
  return agents.find(agent => agent.id === id) || null;
};

export const updateUserSpecializedAgent = (agent: SpecializedAgent) => {
  const currentAgents = $userSpecializedAgents.get();
  const updatedAgents = currentAgents.map(a => 
    a.id === agent.id ? agent : a
  );
  
  // Check if agent was found and updated
  if (!currentAgents.some(a => a.id === agent.id)) {
    throw new Error(`Specialized agent with id "${agent.id}" not found`);
  }
  
  $userSpecializedAgents.set(updatedAgents);
};

export const deleteUserSpecializedAgent = (id: string) => {
  const currentAgents = $userSpecializedAgents.get();
  const filteredAgents = currentAgents.filter(a => a.id !== id);
  
  // Check if agent was found and removed
  if (filteredAgents.length === currentAgents.length) {
    throw new Error(`Specialized agent with id "${id}" not found`);
  }
  
  $userSpecializedAgents.set(filteredAgents);
};
