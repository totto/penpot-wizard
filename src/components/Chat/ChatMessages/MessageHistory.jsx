import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseJsonMarkdown } from '@/utils/messagesUtils'
import ToolCallDetails from './ToolCallDetails/ToolCallDetails'
import styles from './ChatMessages.module.css'

/**
 * MessageHistory Component (V2)
 * Displays the static message history (non-streaming messages)
 * This component is memoized to prevent re-renders during streaming
 * Only re-renders when the messages array actually changes
 */
const MessageHistory = memo(({ messages }) => {
  return (
    <>
      {messages.map((message) => {
        let content = message.content

        // Parse assistant messages (JSON format)
        if (message.role === 'assistant') {
          const parsed = parseJsonMarkdown(content || '{"text": "no content"}')
          content = parsed || { text: content }
        }

        return (
          <div
            key={message.id}
            className={`${styles.message} ${styles[message.role]}`}
          >
            {/* Show tool calls above the message */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className={styles.toolCallsContainer}>
                {message.toolCalls.map((toolCall, index) => (
                  <ToolCallDetails 
                    key={toolCall.toolCallId || index} 
                    toolCall={toolCall} 
                  />
                ))}
              </div>
            )}
            
            <div className={styles.messageContent}>
              {message.role === 'assistant' ? (
                <ReactMarkdown>{content.text || content}</ReactMarkdown>
              ) : (
                content
              )}
            </div>
            <div className={styles.timestamp}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        )
      })}
    </>
  )
})

MessageHistory.displayName = 'MessageHistory'

export default MessageHistory

