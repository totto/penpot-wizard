import { useState } from 'react'
import { useStore } from '@nanostores/react'
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'
import { 
  $activeDirectorAgent, 
  $directorAgentsData, 
  setActiveDirectorAgent,
  getDirectorById 
} from '@/stores/directorAgentsStore'
import { 
  $activeConversation,
  createNewConversation,
  setActiveConversation,
  getConversationsForDirector 
} from '@/stores/conversationsStore'
import styles from './Header.module.css'

function Header() {
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  
  const activeDirectorAgent = useStore($activeDirectorAgent)
  const agentsData = useStore($directorAgentsData)
  const activeConversation = useStore($activeConversation)
  
  const activeDirector = activeDirectorAgent ? getDirectorById(activeDirectorAgent) : null
  const directorConversations = activeDirectorAgent ? getConversationsForDirector(activeDirectorAgent) : []
  
  const handleAgentSelect = (agentId) => {
    setActiveDirectorAgent(agentId)
    setShowAgentDropdown(false)
  }
  
  const handleNewConversation = () => {
    if (activeDirectorAgent) {
      createNewConversation(activeDirectorAgent)
    }
  }
  
  const handleConversationSelect = (conversationId) => {
    setActiveConversation(conversationId)
    setShowHistoryDropdown(false)
  }
  
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Director Agent Badge */}
        <div className={styles.agentSection}>
          {activeDirector ? (
            <button 
              className={styles.agentBadge}
              onClick={() => setShowAgentDropdown(!showAgentDropdown)}
            >
              <span className={styles.agentName}>{activeDirector.name}</span>
              {agentsData.length > 1 && (
                <ChevronDownIcon className={styles.dropdownIcon} />
              )}
            </button>
          ) : (
            <div className={styles.noAgent}>No Agent Selected</div>
          )}
          
          {/* Agent Selector Dropdown */}
          {showAgentDropdown && agentsData.length > 1 && (
            <div className={styles.dropdown}>
              {agentsData.map(director => (
                <button
                  key={director.id}
                  className={`${styles.dropdownItem} ${director.id === activeDirectorAgent ? styles.active : ''}`}
                  onClick={() => handleAgentSelect(director.id)}
                >
                  <div className={styles.dropdownItemName}>{director.name}</div>
                  <div className={styles.dropdownItemDesc}>{director.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.rightSection}>
        {/* New Conversation Button */}
        <button 
          className={styles.newConversationBtn}
          onClick={handleNewConversation}
          disabled={!activeDirectorAgent}
          title="Start new conversation"
        >
          <PlusIcon className={styles.icon} />
        </button>
        
        {/* Conversations History Dropdown */}
        {directorConversations.length > 0 && (
          <div className={styles.historySection}>
            <button 
              className={styles.historyBtn}
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            >
              <span className={styles.historyText}>
                {activeConversation ? 'Switch Conversation' : 'Conversations'}
              </span>
              <ChevronDownIcon className={styles.dropdownIcon} />
            </button>
            
            {showHistoryDropdown && (
              <div className={styles.historyDropdown}>
                {directorConversations.map(conversation => (
                  <button
                    key={conversation.id}
                    className={`${styles.historyItem} ${conversation.id === activeConversation?.id ? styles.active : ''}`}
                    onClick={() => handleConversationSelect(conversation.id)}
                  >
                    <div className={styles.historyItemSummary}>
                      {conversation.summary || 'New conversation'}
                    </div>
                    <div className={styles.historyItemDate}>
                      {conversation.createdAt.toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Click outside to close dropdowns */}
      {(showAgentDropdown || showHistoryDropdown) && (
        <div 
          className={styles.overlay}
          onClick={() => {
            setShowAgentDropdown(false)
            setShowHistoryDropdown(false)
          }}
        />
      )}
    </header>
  )
}

export default Header
