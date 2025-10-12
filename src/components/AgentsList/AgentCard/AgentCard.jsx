import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import styles from '@/components/AgentsList/AgentCard/AgentCard.module.css';

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
    </div>
  );
}

export default AgentCard;
