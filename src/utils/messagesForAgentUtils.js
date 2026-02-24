/**
 * Converts messages from localStorage / getActiveMessages() format
 * to AI SDK format for director.instance.stream({ messages }).
 *
 * Only subagent calls are preserved (designer, planner, drawer, etc.); regular
 * tool calls (RAG, get-current-page, etc.) are filtered out. Tool results are
 * summarized to keep context lightweight.
 */

import { getSpecializedAgentById } from '@/stores/specializedAgentsStore';

function isSubagentCall(toolName) {
  return Boolean(getSpecializedAgentById(toolName));
}

/**
 * Extracts a short summary string from a tool output object.
 * For subagents: includes payload (actual agent response) truncated to 300 chars.
 * Keeps context lightweight but gives the model enough signal.
 */
function summarizeToolOutput(output) {
  if (!output) return 'Tool completed.';
  if (typeof output === 'string') {
    return output.length > 300 ? output.substring(0, 300) + '…' : output;
  }
  // Subagent output: { success, message, payload } - prefer payload (actual response)
  if (output.payload !== undefined && output.payload !== null) {
    const payloadStr = typeof output.payload === 'string'
      ? output.payload
      : JSON.stringify(output.payload);
    return payloadStr.length > 300 ? payloadStr.substring(0, 300) + '…' : payloadStr;
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
  // Keep only subagent calls; filter out regular tool calls (RAG, get-current-page, etc.)
  const subagentCallsOnly = toolCalls.filter((tc) => isSubagentCall(tc.toolName));
  const withOutput = subagentCallsOnly.filter(
    (tc) => tc.output !== undefined && tc.output !== null
  );

  const toolCallParts = withOutput.map((tc) => ({
    type: 'tool-call',
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: tc.input ?? {}
  }));

  const textContent = (msg.content && String(msg.content).trim()) || '';

  // If all tool calls were filtered (none are subagents) and no text, skip this message
  if (withOutput.length === 0 && !textContent) {
    return [];
  }

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
