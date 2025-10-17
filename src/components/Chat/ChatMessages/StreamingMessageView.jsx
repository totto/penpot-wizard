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
      {/* Show tool calls above the message */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className={styles.toolCallsContainer}>
          {message.toolCalls.map((toolCall, index) => {
            // Render based on tool call state and type
            if (toolCall.toolName === 'imageGenerator') {
              // Special rendering for image generation
              if (toolCall.state === 'started') {
                return (
                  <div key={index} className={styles.toolCallItem}>
                    <div className={styles.toolCallStatus}>
                      🎨 Generating image...
                    </div>
                  </div>
                );
              } else if (toolCall.state === 'success' && toolCall.output) {
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
              } else if (toolCall.state === 'error') {
                return (
                  <div key={index} className={styles.toolCallError}>
                    ❌ Image generation failed: {toolCall.error || 'Unknown error'}
                  </div>
                );
              }
            } else {
              // Generic rendering for other tools
              return (
                <div key={index} className={styles.toolCallItem}>
                  <div className={`${styles.toolCallStatus} ${styles[toolCall.state]}`}>
                    {toolCall.state === 'started' && `⏳ Running ${toolCall.toolName}...`}
                    {toolCall.state === 'success' && `✓ ${toolCall.toolName} completed`}
                    {toolCall.state === 'error' && `✗ ${toolCall.toolName} failed: ${toolCall.error}`}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
      
      <div className={styles.messageContent}>
        {message.error ? (
          <div className={styles.errorMessage}>
            ⚠️ {message.error}
          </div>
        ) : (
          <>
            <ReactMarkdown>{content.text || ''}</ReactMarkdown>
            {message.isStreaming && <span className={styles.cursor}>|</span>}
          </>
        )}
      </div>
      <div className={styles.timestamp}>{timestamp}</div>
    </div>
  )
}

export default StreamingMessageView

