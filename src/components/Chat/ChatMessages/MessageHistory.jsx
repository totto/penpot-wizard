import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseJsonMarkdown } from '@/utils/messagesUtils'
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
                {message.toolCalls.map((toolCall, index) => {
                  // Render based on tool call type
                  if (toolCall.toolName === 'imageGenerator' && toolCall.state === 'success' && toolCall.output) {
                    try {
                      const result = JSON.parse(toolCall.output);
                      if (result.imageId) {
                        const imageData = typeof window !== 'undefined' && window.__generatedImages?.get(result.imageId);
                        if (imageData) {
                          return (
                            <div key={index} className={styles.generatedImage}>
                              <img 
                                src={imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`} 
                                alt="Generated" 
                                style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }}
                              />
                            </div>
                          );
                        }
                      }
                    } catch (e) {
                      console.error('Error parsing image result:', e);
                    }
                  } else if (toolCall.toolName === 'imageGenerator' && toolCall.state === 'error') {
                    return (
                      <div key={index} className={styles.toolCallError}>
                        ❌ Image generation failed: {toolCall.error || 'Unknown error'}
                      </div>
                    );
                  } else if (toolCall.state === 'success') {
                    // Generic tool completed
                    return (
                      <div key={index} className={styles.toolCallItem}>
                        <div className={`${styles.toolCallStatus} ${styles.success}`}>
                          ✓ {toolCall.toolName} completed
                        </div>
                      </div>
                    );
                  } else if (toolCall.state === 'error') {
                    return (
                      <div key={index} className={styles.toolCallItem}>
                        <div className={`${styles.toolCallStatus} ${styles.error}`}>
                          ✗ {toolCall.toolName} failed: {toolCall.error}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
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

