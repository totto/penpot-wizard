import { getSpecializedAgentById } from '@/stores/specializedAgentsStore';

/**
 * Converts messages from localStorage / getActiveMessages() format to AI SDK format.
 *
 * - User messages: passed as-is (hidden ones skipped)
 * - Assistant messages: only text content; agent-call summary in a system message
 *   interleaved right after that assistant turn (RAG and other tools excluded)
 *
 * @param messages - Array of messages in storage format
 * @returns {Array<object>} Messages in AI SDK format for stream({ messages })
 */
export function convertMessagesForAgent(messages) {
  const result = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.hidden) continue;
      result.push({
        role: 'user',
        content: msg.content ?? ''
      });
    } else if (msg.role === 'assistant') {
      const hasToolCalls = Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0;
      const textContent = (msg.content && String(msg.content).trim()) || '';

      if (hasToolCalls) {
        (msg.toolCalls || []).forEach((tc) => {
          if (getSpecializedAgentById(tc.toolName)) {
            result.push({
              role: 'tool',
              tool_call_id: tc.toolCallId,
              content: [{
                type: 'tool-result',
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                output: {type: 'text', value: tc.output?.payload || ''}
              }]
            });
          }
        });
      }
      
      if (textContent) {
        result.push({ role: 'assistant', content: textContent });
      }
    }
  }
  return result;
}
