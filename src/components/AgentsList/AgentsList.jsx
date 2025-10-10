import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import AgentCard from './AgentCard/AgentCard';
import { $agentsData, $activeDirectorAgent, setActiveDirectorAgent, getDirectorWithDetails } from '../../stores/agentsStore';
import styles from './AgentsList.module.css';

function AgentsList() {
  const agentsData = useStore($agentsData);
  const activeDirectorAgent = useStore($activeDirectorAgent);

  const handleAgentSelect = (agentId) => {
    setActiveDirectorAgent(agentId);
  };

  useEffect(() => {
    console.log("component rerendered");
  });
  return (
    <div className={styles.agentsContent}>
      <div className={styles.agentsHeader}>
        <h2 className={styles.title}>Available Agents</h2>
        <p className={styles.subtitle}>
          Select a director agent to start a conversation. Each director can delegate tasks to specialized agents and tools.
        </p>
      </div>
      
      <div className={styles.agentsList}>
        {agentsData.directors.map((director) => {
          const directorDetails = getDirectorWithDetails(director.id);
          
          return (
            <AgentCard
              key={director.id}
              agent={{
                ...director,
                specializedAgents: directorDetails?.specializedAgents || [],
                tools: directorDetails?.tools || []
              }}
              isSelected={activeDirectorAgent === director.id}
              onSelect={handleAgentSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

export default AgentsList;
