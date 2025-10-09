import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import styles from './SidebarSection.module.css';

function SidebarSection({ title, children, defaultCollapsed = false, showIncompleteIndicator = false }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={styles.section}>
      <div 
        className={styles.sectionHeader}
        onClick={toggleCollapsed}
      >
        <h3 className={styles.sectionTitle}>
          {title}
          {showIncompleteIndicator && <span className={styles.incompleteIndicator}> - Configuration Required</span>}
        </h3>
        <button className={styles.collapseButton}>
          {isCollapsed ? (
            <ChevronDownIcon className={styles.collapseIcon} />
          ) : (
            <ChevronUpIcon className={styles.collapseIcon} />
          )}
        </button>
      </div>
      <div className={styles.sectionContent + ' ' + (isCollapsed ? styles.collapsed : styles.expanded)}>
        {children}
      </div>
    </div>
  );
}

export default SidebarSection;
