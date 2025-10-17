import {
  updateStreamingContent,
  startToolCall,
  completeToolCall,
  setStreamingError
} from '@/stores/streamingMessageStore';

/**
 * Handles the processing of a stream from the AI model
 * Processes text deltas, tool calls, tool results, and errors
 * 
 * @param stream - The full stream from the AI model
 * @returns The complete response text accumulated from all text deltas
 */
export async function handleStreamProcessing(
  stream: AsyncIterable<any>
): Promise<string> {
  let fullResponse = '';

  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') {
      fullResponse += chunk.text;
      updateStreamingContent(fullResponse);
    } else if (chunk.type === 'tool-call') {
      console.log('Tool call:', chunk);
      // Start tracking this tool call
      startToolCall(chunk.toolCallId, chunk.toolName, chunk.input);
    } else if (chunk.type === 'tool-result') {
      console.log('Tool result:', chunk);
      // Complete the tool call with its output
      completeToolCall(chunk.toolCallId, chunk.output);
    } else if (chunk.type === 'error') {
      console.error('Error during stream:', chunk);
      setStreamingError(`Error: ${chunk.error instanceof Error ? chunk.error.message : 'Unknown error'}`);
    }
  }

  return fullResponse;
}

