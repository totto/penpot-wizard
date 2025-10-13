import { useRef, useMemo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '@nanostores/react'
import { $activeConversation } from '@/stores/conversationsStore'
import { parseJsonMarkdown } from '@/utils/messagesUtils'
import styles from './ChatMessages.module.css'

function ChatMessages() {
  const activeConversation = useStore($activeConversation)
  const lastCorrectStreamingMessage = useRef({})
  const messagesContainerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  
  // Función throttled para hacer scroll
  const throttledScrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) return
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
      scrollTimeoutRef.current = null
    }, 100) // Throttle de 100ms
  }, [])
  
  // Usar useMemo para procesar mensajes solo cuando cambien
  const processedMessages = useMemo(() => {
    if (!activeConversation?.messages) return []
    
    // Scroll throttled al final
    throttledScrollToBottom()

    return activeConversation.messages.map((message) => {
      let content = message.content;

      if (message.role === 'assistant') {
        const newContent = parseJsonMarkdown(content || '{}') 
        || (message.isStreaming ? lastCorrectStreamingMessage.current : {})

        lastCorrectStreamingMessage.current = newContent
        content = newContent
      }

      return {
        ...message,
        timestamp: message.timestamp.toLocaleTimeString(),
        content
      }
    })
  }, [activeConversation?.messages, throttledScrollToBottom])

  return (
    <div className={styles.chatMessages} ref={messagesContainerRef}>
      {processedMessages.map((message) => (
        <div 
          key={message.id} 
          className={`${styles.message} ${styles[message.role]}`}
        >
          <div className={styles.messageContent}>
            {message.role === 'assistant' ? (
              <>
                <ReactMarkdown>{message.content.text}</ReactMarkdown>
                {message.isStreaming && <span className={styles.cursor}>|</span>}
              </>
            ) : (
              message.content
            )}
          </div>
          <div className={styles.timestamp}>
            {message.timestamp}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatMessages
