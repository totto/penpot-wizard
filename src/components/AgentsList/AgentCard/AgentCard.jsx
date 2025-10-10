import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SpecializedAgentItem from '../SpecializedAgentItem/SpecializedAgentItem';
import ToolItem from '../ToolItem/ToolItem';
import styles from './AgentCard.module.css';

function AgentCard({ agent, isSelected, onSelect }) {
  const [isExpanded, setIsExpanded] = useState(isSelected);

  const handleCardClick = () => {
    if (!isSelected) {
      onSelect(agent.id);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`${styles.agentCard} ${isSelected ? styles.selected : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className={styles.directorIcon}>🎯</span>
          <div className={styles.titleInfo}>
            <h3 className={styles.agentName}>{agent.name}</h3>
            <p className={styles.agentDescription}>{agent.description}</p>
          </div>
        </div>
        <div className={styles.cardActions}>
          {isExpanded ? (
            <ChevronDownIcon className={styles.expandIcon} />
          ) : (
            <ChevronRightIcon className={styles.expandIcon} />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className={styles.cardContent}>
          {agent.specializedAgents && agent.specializedAgents.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Specialized Agents</h4>
              <div className={styles.itemsList}>
                {agent.specializedAgents.map((specializedAgent) => (
                  <SpecializedAgentItem 
                    key={specializedAgent.id} 
                    agent={specializedAgent} 
                  />
                ))}
              </div>
            </div>
          )}

          {agent.tools && agent.tools.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Tools</h4>
              <div className={styles.itemsList}>
                {agent.tools.map((tool) => (
                  <ToolItem key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentCard;
