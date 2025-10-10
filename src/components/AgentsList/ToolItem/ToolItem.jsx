import styles from './ToolItem.module.css';

function ToolItem({ tool }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'rag':
        return '📚';
      case 'function':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'rag':
        return styles.ragType;
      case 'function':
        return styles.functionType;
      default:
        return styles.defaultType;
    }
  };

  return (
    <div className={styles.toolItem}>
      <div className={styles.toolHeader}>
        <span className={styles.toolIcon}>{getTypeIcon(tool.type)}</span>
        <div className={styles.toolInfo}>
          <span className={styles.toolName}>{tool.name}</span>
          <span className={`${styles.typeBadge} ${getTypeColor(tool.type)}`}>
            {tool.type.toUpperCase()}
          </span>
        </div>
      </div>
      <p className={styles.toolDescription}>{tool.description}</p>
    </div>
  );
}

export default ToolItem;
