import { useState } from 'react'
import { useStore } from '@nanostores/react'
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { 
  $activeDirectorAgent, 
  $directorAgentsData, 
  setActiveDirectorAgent,
  getDirectorById 
} from '@/stores/directorAgentsStore'
import { $conversationsMetadata } from '@/stores/conversationsMetadataStore'
import { $activeConversationId } from '@/stores/activeConversationStore'
import { 
  tryCreateNewConversation,
  trySetActiveConversation,
  getConversationsForDirector,
  deleteConversation
} from '@/stores/conversationActionsStore'
import { isStreaming, setPendingAction } from '@/stores/streamingMessageStore'
import styles from './Header.module.css'

/**
 * Header Component
 * Optimized version that uses only metadata for conversation list
 */
function Header() {
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  
  const activeDirectorAgent = useStore($activeDirectorAgent)
  const agentsData = useStore($directorAgentsData)
  const conversationsMetadata = useStore($conversationsMetadata)
  const activeConversationId = useStore($activeConversationId)
  
  const activeDirector = activeDirectorAgent ? getDirectorById(activeDirectorAgent) : null
  const directorConversations = activeDirectorAgent ? getConversationsForDirector(activeDirectorAgent) : []
  
  const handleAgentSelect = (agentId) => {
    setActiveDirectorAgent(agentId)
    setShowAgentDropdown(false)
  }
  
  const handleNewConversation = async () => {
    if (activeDirectorAgent) {
      await tryCreateNewConversation(activeDirectorAgent)
    }
  }
  
  const handleConversationSelect = (conversationId) => {
    const switched = trySetActiveConversation(conversationId)
    if (switched) {
      setShowHistoryDropdown(false)
    }
    // If not switched, dialog will show and dropdown stays open until user decides
  }

  const handleDeleteConversation = (conversationId) => {
    if (isStreaming()) {
      setPendingAction({
        type: 'delete_conversation',
        data: { conversationId }
      })
      return
    }

    deleteConversation(conversationId)
  }
  
  // Get current conversation metadata for display
  const activeConversationMetadata = activeConversationId 
    ? conversationsMetadata.find(m => m.id === activeConversationId)
    : null
  
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
                {activeConversationMetadata ? 'Switch Conversation' : 'Conversations'}
              </span>
              <ChevronDownIcon className={styles.dropdownIcon} />
            </button>
            
            {showHistoryDropdown && (
              <div className={styles.historyDropdown}>
                {directorConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`${styles.historyItem} ${conversation.id === activeConversationId ? styles.active : ''}`}
                  >
                    <button
                      className={styles.historyItemButton}
                      onClick={() => handleConversationSelect(conversation.id)}
                    >
                      <div className={styles.historyItemSummary}>
                        {conversation.summary || 'New conversation'}
                      </div>
                      <div className={styles.historyItemDate}>
                        {conversation.createdAt.toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      className={styles.historyDeleteBtn}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDeleteConversation(conversation.id)
                      }}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <TrashIcon className={styles.deleteIcon} />
                    </button>
                  </div>
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

