import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseJsonMarkdown } from '@/utils/messagesUtils'
import styles from './ChatMessages.module.css'

/**
 * StreamingMessageView Component (V2)
 * Displays the currently streaming message
 * This component re-renders with each chunk, but it's just ONE message
 * Much more efficient than re-rendering the entire message history
 */
function StreamingMessageView({ message }) {
  const lastCorrectContent = useRef({})

  if (!message) return null

  // Parse content
  let content = message.content
  const parsed = parseJsonMarkdown(content || '{}')
  
  // If parsing fails during streaming, use last correct content
  if (parsed) {
    lastCorrectContent.current = parsed
    content = parsed
  } else {
    content = lastCorrectContent.current
  }

  // Generate a temporary timestamp for display
  const timestamp = new Date().toLocaleTimeString()

  return (
    <div className={`${styles.message} ${styles.assistant}`}>
      <div className={styles.messageContent}>
        <ReactMarkdown>{content.text || ''}</ReactMarkdown>
        {message.isStreaming && <span className={styles.cursor}>|</span>}
      </div>
      <div className={styles.timestamp}>{timestamp}</div>
    </div>
  )
}

export default StreamingMessageView

