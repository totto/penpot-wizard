import { useStore } from '@nanostores/react'
import { 
  getConversationsForDirector,
  createNewConversation,
  setActiveConversation,
} from '@/stores/conversationsStore'
import { $activeDirectorAgent } from '@/stores/directorAgentsStore'
import styles from './StartPage.module.css'

function StartPage() {
  const activeDirectorAgent = useStore($activeDirectorAgent)
  const directorConversations = activeDirectorAgent ? getConversationsForDirector(activeDirectorAgent) : []
  
  const handleStartConversation = async () => {
    if (activeDirectorAgent) {
      createNewConversation(activeDirectorAgent)
    }
  }
  
  const handleLoadConversation = (conversationId) => {
    // This will be handled by the header dropdown, but we can add it here too
    // for direct access from the conversation cards
    setActiveConversation(conversationId)
    console.log('Load conversation:', conversationId)
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
        
        {/* Conversation History */}
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
                    {conversation.messages.length} messages
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

