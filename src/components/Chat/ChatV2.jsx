import { useEffect } from 'react'
import HeaderV2 from './Header/HeaderV2'
import ChatMessagesV2 from './ChatMessages/ChatMessagesV2'
import FooterV2 from './Footer/FooterV2'
import StartPageV2 from './StartPage/StartPageV2'
import StreamingCancelDialog from '@/components/StreamingCancelDialog/StreamingCancelDialog'
import { $activeConversationId, loadActiveConversation } from '@/stores/activeConversationStore'
import { $showCancelDialog, $streamingMessage, isStreaming, setPendingAction } from '@/stores/streamingMessageStore'
import { handleContinueStreaming, handleCancelStreaming } from '@/stores/conversationActionsStore'
import { useStore } from '@nanostores/react'
import styles from './Chat.module.css'

/**
 * ChatV2 Component
 * Optimized chat interface using V2 stores
 * 
 * Performance improvements:
 * - Only active conversation messages in memory
 * - Streaming message separated from history
 * - Minimal re-renders during streaming
 * - Lightweight metadata for conversation list
 */
function ChatV2() {
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
      <HeaderV2 />
      {!activeConversationId ? (
          <StartPageV2 />
        ) : (
          <ChatMessagesV2 />
        )
      }
      <FooterV2 />
      
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

export default ChatV2

