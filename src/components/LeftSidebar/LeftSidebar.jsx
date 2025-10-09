import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import SettingsForm from '../SettingsForm/SettingsForm'
import AgentsList from '../AgentsList/AgentsList'
import SidebarSection from '../SidebarSection/SidebarSection'
import { useSettingsStore } from '../../stores/settingsStore'
import styles from './LeftSidebar.module.css'

function LeftSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { openaiApiKey, getIsConnected } = useSettingsStore()
  
  // Get computed connection status from settings store
  const isConnected = getIsConnected()

  // Check if configuration is complete
  const isConfigComplete = Boolean(openaiApiKey?.trim())

  // Force sidebar to stay open if config is not complete
  useEffect(() => {
    if (!isConfigComplete) {
      setIsExpanded(true)
    }
  }, [isConfigComplete])

  const toggleExpanded = () => {
    // Only allow toggling if config is complete
    if (isConfigComplete) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <div className={styles.content}>
        <SidebarSection 
          title="AI Settings"
          showIncompleteIndicator={!isConfigComplete}
        >
          <SettingsForm />
        </SidebarSection>

        <SidebarSection title="Agents">
          <AgentsList />
        </SidebarSection>
      </div>
      
      <div className={styles.iconsSidebar}>
        <div className={styles.controls}>
          <button 
            className={`${styles.expandButton} ${!isConfigComplete ? styles.disabled : ''}`}
            onClick={toggleExpanded}
            disabled={!isConfigComplete}
            title={!isConfigComplete ? 'Complete configuration to enable sidebar controls' : (isExpanded ? 'Collapse sidebar' : 'Expand sidebar')}
          >
            {isExpanded ? (
              <ChevronLeftIcon className={styles.icon} />
            ) : (
              <ChevronRightIcon className={styles.icon} />
            )}
          </button>
          
          <button 
            className={`${styles.statusButton} ${isConnected ? styles.connected : styles.disconnected}`}
            title={isConnected ? 'Connected to OpenAI' : 'Not connected'}
          >
            {isConnected ? '●' : '●'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
