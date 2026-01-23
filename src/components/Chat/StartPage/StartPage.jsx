import { useStore } from '@nanostores/react'
import { 
  tryCreateNewConversation,
  trySetActiveConversation
} from '@/stores/conversationActionsStore'
import { $activeDirectorAgent } from '@/stores/directorAgentsStore'
import { $conversationsMetadata } from '@/stores/conversationsMetadataStore'
import styles from './StartPage.module.css'

/**
 * StartPage Component
 * Uses metadata-only approach for efficient conversation listing
 */
function StartPage() {
  const activeDirectorAgent = useStore($activeDirectorAgent)
  const conversationsMetadata = useStore($conversationsMetadata)
  const directorConversations = activeDirectorAgent
    ? conversationsMetadata
        .filter(conversation => conversation.directorAgentId === activeDirectorAgent)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    : []
  
  const handleStartConversation = async () => {
    if (activeDirectorAgent) {
      await tryCreateNewConversation(activeDirectorAgent)
    }
  }
  
  const handleLoadConversation = (conversationId) => {
    trySetActiveConversation(conversationId)
  }

  return (
    <div className={styles.startPageContainer}>
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <h2 className={styles.emptyTitle}>Start a Conversation</h2>
          <p className={styles.emptyDescription}>
            Begin chatting with your AI assistant to get help with your tasks.
          </p>
          <button 
            className={styles.startButton}
            onClick={handleStartConversation}
            disabled={!activeDirectorAgent}
          >
            Start Conversation
          </button>
        </div>
        
        {/* Conversation History - using metadata only */}
        {directorConversations.length > 0 && (
          <div className={styles.historySection}>
            <h3 className={styles.historyTitle}>Recent Conversations</h3>
            <div className={styles.conversationGrid}>
              {directorConversations.map(conversation => (
                <div 
                  key={conversation.id}
                  className={styles.conversationCard}
                  onClick={() => handleLoadConversation(conversation.id)}
                >
                  <div className={styles.conversationSummary}>
                    {conversation.summary || 'New conversation'}
                  </div>
                  <div className={styles.conversationDate}>
                    {conversation.createdAt.toLocaleDateString()}
                  </div>
                  <div className={styles.conversationMessages}>
                    {conversation.messageCount} messages
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StartPage

