import { useState } from 'react'
import styles from '../ChatMessages.module.css'

/**
 * Filters output to only include success, payload, and error fields
 */
function filterOutputFields(data) {
  if (data === undefined || data === null) {
    return null
  }
  
  try {
    let parsed = data
    
    // If it's a string, try to parse it
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data)
      } catch {
        // Not JSON, return as-is
        return data
      }
    }
    
    // If it's an object, filter to only include success, message, payload, and error
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const filtered = {}
      if ('success' in parsed) filtered.success = parsed.success
      if ('message' in parsed) filtered.message = parsed.message
      if ('payload' in parsed) filtered.payload = parsed.payload
      if ('error' in parsed) filtered.error = parsed.error
      return filtered
    }
    
    // For arrays or other types, return as-is
    return parsed
  } catch {
    return data
  }
}

/**
 * Formats data (input/output) for display.
 * Always shows as JSON for consistency (success, message format for tool outputs).
 */
function formatData(data) {
  if (data === undefined || data === null) {
    return null
  }

  try {
    // If it's already a string, try to parse and re-stringify for pretty print
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      } catch {
        // Not JSON, return as-is
        return data
      }
    }
    
    // For objects/arrays, stringify with pretty print
    return JSON.stringify(data, null, 2)
  } catch {
    // Fallback to string representation
    return String(data)
  }
}

/**
 * Gets the appropriate icon and color for tool call state
 */
function getStateDisplay(state) {
  switch (state) {
    case 'started':
      return { icon: '⏳', color: 'var(--foreground-secondary)' }
    case 'success':
      return { icon: '✓', color: '#51cf66' }
    case 'error':
      return { icon: '✗', color: '#ff6b6b' }
    default:
      return { icon: '○', color: 'var(--foreground-secondary)' }
  }
}

/**
 * ToolCallDetails Component
 * Displays a collapsible tool call with input, output, and nested tool calls
 * 
 * @param {Object} props
 * @param {Object} props.toolCall - The tool call object
 * @param {boolean} props.isNested - Whether this is a nested tool call (affects styling)
 */
function ToolCallDetails({ toolCall, isNested = false }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Filter output to only show success, payload, and error fields
  const filteredOutput = filterOutputFields(toolCall.output)
  const isOutputFailure =
    typeof filteredOutput === 'object' &&
    filteredOutput !== null &&
    filteredOutput.success === false
  const effectiveState =
    toolCall.state === 'success' && isOutputFailure ? 'error' : toolCall.state

  const stateDisplay = getStateDisplay(effectiveState)
  const formattedInput = formatData(toolCall.input)
  const outputPayload = filteredOutput?.payload
  const formattedPayload = outputPayload != null ? formatData(outputPayload) : null
  const outputMessage = filteredOutput?.message ?? filteredOutput?.error
  const hasOutput = outputPayload != null || outputMessage != null
  const hasNestedToolCalls = toolCall.toolCalls && toolCall.toolCalls.length > 0
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div className={`${styles.toolCallDetailsContainer} ${isNested ? styles.nestedToolCall : ''}`}>
      <div className={styles.toolCallHeader} onClick={toggleExpanded}>
        <div className={styles.toolCallHeaderLeft}>
          <span className={`${styles.toolCallExpandIcon} ${isExpanded ? styles.expanded : ''}`}>
            ▶
          </span>
          <span className={styles.toolCallName}>{toolCall.toolName}</span>
        </div>
        <span className={styles.toolCallStateIcon} style={{ color: stateDisplay.color }}>
          {stateDisplay.icon}
        </span>
      </div>
      
      <div className={`${styles.toolCallBody} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.toolCallBodyContent}>
          {/* Input Section */}
          {formattedInput && (
            <div className={styles.toolCallSection}>
              <div className={styles.toolCallSectionTitle}>Input</div>
              <div className={styles.toolCallData}>{formattedInput}</div>
            </div>
          )}
          
          {/* Output Section - title with message when present, content = payload only */}
          {effectiveState !== 'started' && hasOutput && (
            <div className={styles.toolCallSection}>
              <div className={`${styles.toolCallSectionTitle} ${isOutputFailure ? styles.toolCallSectionTitleError : ''}`}>
                {isOutputFailure && <span className={styles.toolCallOutputErrorIcon}>✗</span>}
                Output{outputMessage && <span className={styles.toolCallSectionTitleMessage}>: {outputMessage}</span>}
              </div>
              {formattedPayload && (
                <div className={styles.toolCallData}>{formattedPayload}</div>
              )}
            </div>
          )}
          
          {/* Nested Tool Calls Section */}
          {hasNestedToolCalls && (
            <div className={styles.nestedToolCallsContainer}>
              <div className={styles.nestedToolCallLabel}>
                Nested Tool Calls ({toolCall.toolCalls.length})
              </div>
              {toolCall.toolCalls.map((nestedCall, index) => (
                <ToolCallDetails
                  key={nestedCall.toolCallId || index}
                  toolCall={nestedCall}
                  isNested={true}
                />
              ))}
            </div>
          )}
          
          {/* Empty state when tool is still running */}
          {effectiveState === 'started' && !hasNestedToolCalls && (
            <div className={styles.toolCallEmpty}>
              Tool is running...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ToolCallDetails

