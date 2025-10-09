import { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import styles from './Footer.module.css'

function Footer() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  const handleInputChange = (e) => {
    setMessage(e.target.value)
  }

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message)
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
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

  return (
    <footer className={styles.footer}>
      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          className={styles.textarea}
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!message.trim()}
          className={styles.sendButton}
          title="Send message"
        >
          <PaperAirplaneIcon className={styles.sendIcon} />
        </button>
      </div>
    </footer>
  )
}

export default Footer
