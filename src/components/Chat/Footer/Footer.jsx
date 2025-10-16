import { useState, useRef, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { $activeConversationFull } from '@/stores/activeConversationStore'
import { $streamingMessage } from '@/stores/streamingMessageStore'
import { sendUserMessage } from '@/stores/conversationActionsStore'
import styles from './Footer.module.css'

/**
 * Footer Component
 * Input area for sending messages
 */
function Footer() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)
  
  const activeConversation = useStore($activeConversationFull)
  const streamingMessage = useStore($streamingMessage)
  
  // Check if streaming is active
  const isStreaming = streamingMessage?.isStreaming || false
  
  const handleInputChange = (e) => {
    setMessage(e.target.value)
  }

  const handleSend = async () => {
    if (!message.trim() || isStreaming || !activeConversation) {
      return
    }
    
    const userMessage = message.trim()
    setMessage('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Send message
    await sendUserMessage(userMessage)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [message])

  // Don't render if no active conversation
  if (!activeConversation) {
    return null
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={isStreaming ? "AI is responding..." : "Type your message here... (Press Enter to send, Shift+Enter for new line)"}
          className={styles.textarea}
          rows={1}
          disabled={isStreaming}
        />
        <button 
          onClick={handleSend}
          disabled={!message.trim() || isStreaming}
          className={styles.sendButton}
          title={isStreaming ? "AI is responding..." : "Send message"}
        >
          <PaperAirplaneIcon className={styles.sendIcon} />
        </button>
      </div>
    </footer>
  )
}

export default Footer

