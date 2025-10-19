import { addNestedToolCall, updateNestedToolCall } from '@/stores/streamingMessageStore';
import type { AgentToolCall } from '@/types/types';
import { TextStreamPart, ToolSet } from 'ai';

/**
 * Handles the processing of a stream from a specialized agent
 * Captures tool calls and associates them with the parent tool call
 * 
 * @param stream - The full stream from the specialized agent
 * @param parentToolCallId - The ID of the parent tool call (the specialized agent itself)
 * @returns The complete response text accumulated from all text deltas
 */
export async function handleNestedStreamProcessing(
  stream: AsyncIterable<TextStreamPart<ToolSet>>,
  parentToolCallId: string
): Promise<string> {
  let fullResponse = '';

  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') {
      // Accumulate text but don't update the main streaming content
      // The specialized agent's text will be shown as output when complete
      fullResponse += chunk.text;
    } else if (chunk.type === 'tool-call') {
      // Create a nested tool call
      const nestedToolCall: AgentToolCall = {
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        state: 'started',
        input: chunk.input
      };
      
      // Add it to the parent tool call
      addNestedToolCall(parentToolCallId, nestedToolCall);
    } else if (chunk.type === 'tool-result') {      
      // Update the nested tool call with success state and output
      updateNestedToolCall(parentToolCallId, chunk.toolCallId, {
        state: 'success',
        output: chunk.output
      });
    } else if (chunk.type === 'error') {
      console.error('Error during nested stream:', chunk);
      
      // If we can identify which tool call failed, mark it as error
      // Otherwise, this error affects the whole specialized agent execution
      const errorMessage = chunk.error instanceof Error ? chunk.error.message : 'Unknown error';
      
      // This will be handled by the specialized agent's execute function
      throw new Error(errorMessage);
    }
  }

  return fullResponse;
}

