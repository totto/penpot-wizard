/**
 * Converts messages from localStorage / getActiveMessages() format
 * to AI SDK format for director.instance.stream({ messages }).
 *
 * Tool calls are preserved so the model knows it invoked tools in previous
 * turns, but tool results are summarized (success/error message only, no
 * payload) to keep context lightweight. The director's prompt requires it
 * to inline all relevant data in its text responses via <response_completeness>.
 */

/**
 * Extracts a short summary string from a tool output object.
 * Keeps only the status message, discarding large payloads.
 */
function summarizeToolOutput(output) {
  if (!output) return 'Tool completed.';
  if (typeof output === 'string') {
    return output.length > 300 ? output.substring(0, 300) + '…' : output;
  }
  if (output.message) return output.message;
  return 'Tool completed.';
}

/**
 * Converts an assistant message with toolCalls to AI SDK format.
 * Tool-call parts are kept (so the model sees what it called).
 * Tool results carry only a short summary string, not the full payload.
 */
function convertAssistantWithToolCalls(msg) {
  const toolCalls = msg.toolCalls || [];
  const withOutput = toolCalls.filter(
    (tc) => tc.output !== undefined && tc.output !== null
  );

  const toolCallParts = withOutput.map((tc) => ({
    type: 'tool-call',
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: tc.input ?? {}
  }));

  const textContent = (msg.content && String(msg.content).trim()) || '';
  let assistantContent;

  if (toolCallParts.length > 0) {
    const parts = [];
    if (textContent) {
      parts.push({ type: 'text', text: textContent });
    }
    parts.push(...toolCallParts);
    assistantContent = parts;
  } else {
    assistantContent = textContent || '';
  }

  const result = [{ role: 'assistant', content: assistantContent }];

  if (withOutput.length > 0) {
    const toolContent = withOutput.map((tc) => ({
      type: 'tool-result',
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      output: { type: 'text', value: summarizeToolOutput(tc.output) }
    }));
    result.push({ role: 'tool', content: toolContent });
  }

  return result;
}

/**
 * Converts messages from localStorage / getActiveMessages() format to AI SDK format.
 *
 * - User messages: passed as-is (hidden ones skipped)
 * - Assistant messages with tool calls: tool-call parts preserved, results summarized
 * - Assistant messages without tool calls: text only (empty ones skipped)
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

      if (hasToolCalls) {
        const converted = convertAssistantWithToolCalls(msg);
        result.push(...converted);
      } else {
        const textContent = (msg.content && String(msg.content).trim()) || '';
        if (textContent) {
          result.push({ role: 'assistant', content: textContent });
        }
      }
    }
  }

  return result;
}
