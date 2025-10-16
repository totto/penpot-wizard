import { useEffect } from 'react'
import Header from './Header/Header'
import ChatMessages from './ChatMessages/ChatMessages'
import Footer from './Footer/Footer'
import StartPage from './StartPage/StartPage'
import StreamingCancelDialog from '@/components/StreamingCancelDialog/StreamingCancelDialog'
import { $activeConversationId, loadActiveConversation } from '@/stores/activeConversationStore'
import { $showCancelDialog, $streamingMessage, isStreaming, setPendingAction } from '@/stores/streamingMessageStore'
import { handleContinueStreaming, handleCancelStreaming } from '@/stores/conversationActionsStore'
import { useStore } from '@nanostores/react'
import styles from './Chat.module.css'

/**
 * Chat Component
 * Optimized chat interface
 * 
 * Performance improvements:
 * - Only active conversation messages in memory
 * - Streaming message separated from history
 * - Minimal re-renders during streaming
 * - Lightweight metadata for conversation list
 */
function Chat() {
  const activeConversationId = useStore($activeConversationId)
  const showCancelDialog = useStore($showCancelDialog)
  const streamingMessage = useStore($streamingMessage)

  // Load messages when component mounts if there's an active conversation ID
  useEffect(() => {
    if (activeConversationId) {
      loadActiveConversation(activeConversationId)
    }
  }, [activeConversationId])

  // Auto-close dialog if streaming finishes naturally while dialog is open
  useEffect(() => {
    if (showCancelDialog && !streamingMessage) {
      // Streaming finished, auto-execute pending action
      console.log('Streaming finished naturally, auto-executing pending action')
      handleCancelStreaming()
    }
  }, [showCancelDialog, streamingMessage])

  // Handle page reload/close during streaming
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isStreaming()) {
        e.preventDefault()
        e.returnValue = ''
        
        // Set pending action for reload
        setPendingAction({
          type: 'reload'
        })
        
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <div className={styles.chat}>
      <Header />
      {!activeConversationId ? (
          <StartPage />
        ) : (
          <ChatMessages />
        )
      }
      <Footer />
      
      {/* Streaming cancellation dialog */}
      {showCancelDialog && (
        <StreamingCancelDialog
          onContinue={handleContinueStreaming}
          onCancel={handleCancelStreaming}
        />
      )}
    </div>
  )
}

export default Chat

