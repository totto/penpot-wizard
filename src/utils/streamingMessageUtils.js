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
    // Track tool calls that have been started but not yet completed
    this.pendingToolCalls = new Map();
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
          // Track this tool call as pending
          this.pendingToolCalls.set(chunk.toolCallId, {
            toolName: chunk.toolName,
            input: chunk.input,
            parentToolCallId: this.parentToolCallId,
            startedAt: Date.now()
          });
        } else if (chunk.type === 'tool-result') {
          // The AI SDK passes the tool's return value in chunk.result (not chunk.output)
          // chunk.output might be undefined, so we check chunk.result first
          const output = chunk.result !== undefined ? chunk.result : chunk.output;
          
          // Update tool call with success state and output
          // Always pass output even if undefined, so the UI can handle it appropriately
          updateToolCall(chunk.toolCallId, { 
            state: 'success', 
            output: output 
          });
          
          // Remove from pending since it completed successfully
          this.pendingToolCalls.delete(chunk.toolCallId);
        } else if (chunk.type === 'error') {
          console.error('Error during stream:', chunk);
          
          // Check if this error is associated with a specific tool call
          // The AI SDK may include toolCallId in error chunks for validation errors
          if (chunk.toolCallId) {
            const errorMessage = chunk.error instanceof Error 
              ? chunk.error.message 
              : (typeof chunk.error === 'string' ? chunk.error : 'Unknown error');
            
            updateToolCall(chunk.toolCallId, { 
              state: 'error', 
              error: errorMessage 
            });
            // Remove from pending since we've handled it
            const pendingInfo = this.pendingToolCalls.get(chunk.toolCallId);
            this.pendingToolCalls.delete(chunk.toolCallId);
            if (pendingInfo) {
              console.error('Tool call failed with error chunk:', {
                toolCallId: chunk.toolCallId,
                toolName: pendingInfo.toolName,
                input: pendingInfo.input,
                parentToolCallId: pendingInfo.parentToolCallId,
                error: errorMessage
              });
            }
          } else {
            // General stream error (not tool-specific)
          setStreamingError(`Error: ${chunk.error instanceof Error ? chunk.error.message : 'Unknown error'}`);
        }
      }
      }
      
      // After stream completes, check for any tool calls that never got a result
      // This handles cases where validation fails before the tool executes
      // and the SDK doesn't emit a tool-result or error chunk with toolCallId
      if (this.pendingToolCalls.size > 0) {
        console.warn(`Found ${this.pendingToolCalls.size} tool call(s) that never completed.`);
        
        for (const [toolCallId, pendingInfo] of this.pendingToolCalls) {
          console.error('Tool call did not return a result (validation/timeout likely):', {
            toolCallId,
            toolName: pendingInfo.toolName,
            input: pendingInfo.input,
            parentToolCallId: pendingInfo.parentToolCallId,
            startedAt: pendingInfo.startedAt,
            ageMs: Date.now() - pendingInfo.startedAt
          });
          // Mark as error with a generic message about validation/execution failure
          updateToolCall(toolCallId, { 
            state: 'error', 
            error: 'Tool execution failed: validation error or execution timeout. Check input parameters.' 
          });
        }
        
        // Clear the set after handling
        this.pendingToolCalls.clear();
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

