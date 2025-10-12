import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import AgentCard from '@/components/AgentsList/AgentCard/AgentCard';
import { $directorAgentsData, $activeDirectorAgent, setActiveDirectorAgent } from '@/stores/directorAgentsStore';
import styles from '@/components/AgentsList/AgentsList.module.css';

function AgentsList() {
  const agentsData = useStore($directorAgentsData);
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
          Select a director agent to start a conversation.
        </p>
      </div>
      
      <div className={styles.agentsList}>
        {agentsData.map((director) => {
          return (
            <AgentCard
              key={director.id}
              agent={director}
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
