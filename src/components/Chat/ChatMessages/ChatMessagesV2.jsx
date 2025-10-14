import { useRef, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $activeConversationMessages } from '@/stores/activeConversationStore'
import { $streamingMessage } from '@/stores/streamingMessageStore'
import MessageHistory from './MessageHistory'
import StreamingMessageView from './StreamingMessageView'
import styles from './ChatMessages.module.css'

/**
 * ChatMessagesV2 Component
 * Optimized version that separates static history from streaming message
 * 
 * Performance benefits:
 * - MessageHistory is memoized and doesn't re-render during streaming
 * - Only StreamingMessageView re-renders with each chunk
 * - Massive reduction in re-renders compared to V1
 */
function ChatMessagesV2() {
  const messages = useStore($activeConversationMessages)
  const streamingMessage = useStore($streamingMessage)
  const messagesContainerRef = useRef(null)

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  return (
    <div className={styles.chatMessages} ref={messagesContainerRef}>
      {/* Static message history - doesn't re-render during streaming */}
      <MessageHistory messages={messages} />
      
      {/* Streaming message - only this re-renders during streaming */}
      <StreamingMessageView message={streamingMessage} />
    </div>
  )
}

export default ChatMessagesV2

