import { useState } from 'react'
import styles from './ChatMessages.module.css'

function ChatMessages() {
  const [messages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: 2,
      type: 'user',
      content: 'This is a sample user message to demonstrate the chat interface.',
      timestamp: new Date().toLocaleTimeString()
    }
  ])

  return (
    <div className={styles.chatMessages}>
      <div className={styles.messagesContainer}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`${styles.message} ${styles[message.type]}`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
            <div className={styles.timestamp}>
              {message.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChatMessages
