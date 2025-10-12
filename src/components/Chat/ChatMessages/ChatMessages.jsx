import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '@nanostores/react'
import { $activeConversation } from '@/stores/conversationsStore'
import { parseDirectorMessage } from '@/utils/messagesUtils'
import StartPage from './StartPage.jsx'
import styles from './ChatMessages.module.css'

function ChatMessages() {
  const messagesEndRef = useRef(null)
  const activeConversation = useStore($activeConversation)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConversation?.messages])
  
  // No active conversation - show empty state
  if (!activeConversation) {
    return <StartPage />
  }
  
  // Active conversation - show messages
  return (
    <div className={styles.chatMessages}>
      <div className={styles.messagesContainer}>
        {activeConversation.messages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageContent}>
              {message.role === 'assistant' ? (
                <>
                  <ReactMarkdown>{parseDirectorMessage(message.content || '{}')?.text}</ReactMarkdown>
                  {message.isStreaming && <span className={styles.cursor}>|</span>}
                </>
              ) : (
                message.content
              )}
            </div>
            <div className={styles.timestamp}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {/* Typing indicator placeholder */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatMessages
