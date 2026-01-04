import {
  updateStreamingContent,
  addToolCall,
  setStreamingError,
  updateToolCall,
} from '@/stores/streamingMessageStore';

export class StreamHandler {
  constructor(stream, parentToolCallId) {
    this.stream = stream;
    this.parentToolCallId = parentToolCallId;
    this.fullResponse = '';
  }

  async handleStream() {
    try {
      for await (const chunk of this.stream) {
        if (chunk.type === 'text-delta') {
          this.fullResponse += chunk.text;
          if (this.parentToolCallId) {
            updateToolCall(this.parentToolCallId, { output: this.fullResponse });
          } else {
            updateStreamingContent(this.fullResponse);
          }
        } else if (chunk.type === 'tool-call') {
          const newToolCall = {
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            state: 'started',
            input: chunk.input
          };
          addToolCall(newToolCall, this.parentToolCallId);
        } else if (chunk.type === 'tool-result') {
          updateToolCall(chunk.toolCallId, { state: 'success', output: chunk.output });
        } else if (chunk.type === 'error') {
          console.error('Error during stream:', chunk);
          setStreamingError(`Error: ${chunk.error instanceof Error ? chunk.error.message : 'Unknown error'}`);
        }
      }
      return this.fullResponse;
    } catch (error) {
      // Distinguish between cancellation and real errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Propagate to caller
      }
      console.error('Stream error:', error);
      setStreamingError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

