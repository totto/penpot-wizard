import { useState, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $chatVersion, setChatVersion } from '@/stores/appConfigStore'
import { 
  measureMemoryUsage, 
  measureLocalStorageSize,
  getV1ConversationsCount,
  getV2ConversationsCount,
  getV1TotalMessages,
  getV2TotalMessages
} from '@/utils/performanceUtils'
import styles from './VersionSwitcher.module.css'

function VersionSwitcher() {
  const chatVersion = useStore($chatVersion)
  const [metrics, setMetrics] = useState({
    memory: 0,
    storage: { v1: 0, v2: 0 },
    v1Conversations: 0,
    v2Conversations: 0,
    v1Messages: 0,
    v2Messages: 0
  })
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        memory: measureMemoryUsage(),
        storage: measureLocalStorageSize(),
        v1Conversations: getV1ConversationsCount(),
        v2Conversations: getV2ConversationsCount(),
        v1Messages: getV1TotalMessages(),
        v2Messages: getV2TotalMessages()
      })
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 2000) // Update every 2 seconds
    return () => clearInterval(interval)
  }, [])

  if (isCollapsed) {
    return (
      <div className={`${styles.switcher} ${styles.collapsed}`}>
        <button 
          className={styles.expandButton}
          onClick={() => setIsCollapsed(false)}
          title="Show performance metrics"
        >
          📊 V{chatVersion === 'v1' ? '1' : '2'}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.switcher}>
      <button 
        className={styles.closeButton}
        onClick={() => setIsCollapsed(true)}
        title="Collapse metrics"
      >
        ×
      </button>

      <div className={styles.header}>
        <label className={styles.label}>
          🔬 Performance Testing
        </label>
      </div>

      <div className={styles.toggleGroup}>
        <button
          className={`${styles.toggleButton} ${chatVersion === 'v1' ? styles.active : ''}`}
          onClick={() => setChatVersion('v1')}
        >
          V1 (Current)
        </button>
        <button
          className={`${styles.toggleButton} ${chatVersion === 'v2' ? styles.active : ''}`}
          onClick={() => setChatVersion('v2')}
        >
          V2 (Optimized)
        </button>
      </div>

      <div className={styles.info}>
        {chatVersion === 'v1' ? (
          <span>⚠️ All messages loaded in memory</span>
        ) : (
          <span>✅ Minimal memory footprint</span>
        )}
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricsTitle}>📊 Real-time Metrics</div>
        
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Memory Usage</span>
            <span className={styles.metricValue}>
              {metrics.memory > 0 ? `${metrics.memory.toFixed(1)} MB` : 'N/A'}
            </span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Active Version</span>
            <span className={`${styles.metricValue} ${styles.highlight}`}>
              {chatVersion.toUpperCase()}
            </span>
          </div>
        </div>

        <div className={styles.separator}></div>

        <div className={styles.metricsTitle}>💾 localStorage Usage</div>
        
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>V1 Storage</span>
            <span className={styles.metricValue}>
              {metrics.storage.v1.toFixed(2)} KB
            </span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>V2 Storage</span>
            <span className={styles.metricValue}>
              {metrics.storage.v2.toFixed(2)} KB
            </span>
          </div>
        </div>

        <div className={styles.separator}></div>

        <div className={styles.stats}>
          <div style={{ marginBottom: '4px' }}>
            <strong>V1:</strong> {metrics.v1Conversations} conversations, {metrics.v1Messages} messages
          </div>
          <div>
            <strong>V2:</strong> {metrics.v2Conversations} conversations, {metrics.v2Messages} messages
          </div>
        </div>
      </div>
    </div>
  )
}

export default VersionSwitcher

