import { useState, useRef, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { $activeConversation, sendUserMessage } from '@/stores/conversationsStore'
import styles from './Footer.module.css'

function Footer() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)
  
  const activeConversation = useStore($activeConversation)
  
  // Check if any assistant message is currently streaming
  const isAnyMessageStreaming = activeConversation?.messages.some(msg => 
    msg.role === 'assistant' && msg.isStreaming
  ) || false
  
  const handleInputChange = (e) => {
    setMessage(e.target.value)
  }

  const handleSend = async () => {
    if (!message.trim() || isAnyMessageStreaming || !activeConversation) {
      return
    }
    
    const userMessage = message.trim()
    setMessage('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Use the new sendUserMessage method from conversationsStore
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
          placeholder={isAnyMessageStreaming ? "AI is responding..." : "Type your message here... (Press Enter to send, Shift+Enter for new line)"}
          className={styles.textarea}
          rows={1}
          disabled={isAnyMessageStreaming}
        />
        <button 
          onClick={handleSend}
          disabled={!message.trim() || isAnyMessageStreaming}
          className={styles.sendButton}
          title={isAnyMessageStreaming ? "AI is responding..." : "Send message"}
        >
          <PaperAirplaneIcon className={styles.sendIcon} />
        </button>
      </div>
    </footer>
  )
}

export default Footer
