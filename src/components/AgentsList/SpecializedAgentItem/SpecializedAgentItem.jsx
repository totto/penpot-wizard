import styles from './SpecializedAgentItem.module.css';

function SpecializedAgentItem({ agent }) {
  return (
    <div className={styles.agentItem}>
      <div className={styles.agentHeader}>
        <span className={styles.agentIcon}>🤖</span>
        <div className={styles.agentInfo}>
          <span className={styles.agentName}>{agent.name}</span>
          <span className={styles.agentType}>Specialized Agent</span>
        </div>
      </div>
      <p className={styles.agentDescription}>{agent.description}</p>
    </div>
  );
}

export default SpecializedAgentItem;
