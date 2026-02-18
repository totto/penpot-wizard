import {
  updateStreamingContent,
  addToolCall,
  setStreamingError,
  updateToolCall,
} from '@/stores/streamingMessageStore';
import { InvalidToolInputError, NoSuchToolError } from 'ai';

export class StreamHandler {
  constructor(stream, parentToolCallId) {
    this.stream = stream;
    this.parentToolCallId = parentToolCallId;
    this.fullResponse = '';
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

          this.pendingToolCalls.set(chunk.toolCallId, {
            toolName: chunk.toolName,
            input: chunk.input,
            parentToolCallId: this.parentToolCallId,
            startedAt: Date.now()
          });
        } else if (chunk.type === 'tool-result') {
          const output = chunk.result !== undefined ? chunk.result : chunk.output;

          updateToolCall(chunk.toolCallId, { 
            state: 'success', 
            output: output 
          });
          
          this.pendingToolCalls.delete(chunk.toolCallId);

        } else if (chunk.type === 'tool-error') {
          const errorMessage = chunk.error instanceof Error 
            ? chunk.error.message 
            : (typeof chunk.error === 'string' ? chunk.error : 'Tool execution failed');
          
          if (chunk.toolCallId) {
            updateToolCall(chunk.toolCallId, { 
              state: 'error', 
              error: `Tool execution error: ${errorMessage}` 
            });
            this.pendingToolCalls.delete(chunk.toolCallId);
          }
        } else if (chunk.type === 'error') {
          console.error('Error during stream:', chunk);
          
          const error = chunk.error;
          let errorMessage = 'Unknown error';
          let toolCallId = chunk.toolCallId;
          let toolName = null;
          
          // Check for InvalidToolInputError (schema validation failure)
          if (InvalidToolInputError.isInstance(error)) {
            toolName = error.toolName;
            
            // Log the full error structure to understand what the SDK provides
            console.error('InvalidToolInputError detected - Full error object:', {
              toolName: error.toolName,
              message: error.message,
              cause: error.cause,
              // Log Zod issues if available
              zodIssues: error.cause?.issues,
              // Full error for inspection
              fullError: error,
            });
            
            // For now, use the raw error message from the SDK
            errorMessage = error.message;
            
            // Try to find the associated tool call if not provided in chunk
            if (!toolCallId && toolName) {
              for (const [id, pending] of this.pendingToolCalls) {
                if (pending.toolName === toolName) {
                  toolCallId = id;
                  break;
                }
              }
            }
          }
          // Check for NoSuchToolError (tool doesn't exist)
          else if (NoSuchToolError.isInstance(error)) {
            toolName = error.toolName;
            errorMessage = `❌ Tool "${toolName}" does not exist. Please use one of the available tools.`;           
            console.error('NoSuchToolError detected:', { toolName });
          }
          // Generic error handling
          else if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          // Update the specific tool call if we have an ID
          if (toolCallId) {
            updateToolCall(toolCallId, { 
              state: 'error', 
              error: errorMessage 
            });
            
            const pendingInfo = this.pendingToolCalls.get(toolCallId);
            this.pendingToolCalls.delete(toolCallId);
            
            if (pendingInfo) {
              console.error('Tool call failed:', {
                toolCallId,
                toolName: pendingInfo.toolName,
                input: pendingInfo.input,
                error: errorMessage
              });
            }
          } else {
            // General stream error (not tool-specific)
            // When nested (subagent), update parent tool call instead of global state
            // to avoid unblocking the chat input while Director is still waiting
            if (this.parentToolCallId) {
              updateToolCall(this.parentToolCallId, {
                state: 'error',
                error: `Error: ${errorMessage}`,
                output: { success: false, error: errorMessage }
              });
            } else {
              setStreamingError(`Error: ${errorMessage}`);
            }
          }
        }
      }
      
      // After stream completes, check for any tool calls that never got a result
      // This handles cases where validation fails before the tool executes
      // and the SDK doesn't emit a tool-result or error chunk with toolCallId
      if (this.pendingToolCalls.size > 0) {
        console.warn(`Found ${this.pendingToolCalls.size} tool call(s) that never completed.`);
        
        for (const [toolCallId, pendingInfo] of this.pendingToolCalls) {
          const ageMs = Date.now() - pendingInfo.startedAt;
          
          console.error('Tool call did not return a result:', {
            toolCallId,
            toolName: pendingInfo.toolName,
            input: pendingInfo.input,
            parentToolCallId: pendingInfo.parentToolCallId,
            startedAt: pendingInfo.startedAt,
            ageMs
          });
          
          // Build a more helpful error message
          let errorMessage = `❌ Tool "${pendingInfo.toolName}" failed to execute.\n`;
          errorMessage += 'This is likely due to invalid input parameters that did not match the expected schema.\n\n';
          errorMessage += 'Received input:\n';
          errorMessage += '```json\n' + JSON.stringify(pendingInfo.input, null, 2) + '\n```\n\n';
          errorMessage += 'Please review the tool schema and ensure all required parameters are provided with correct types.';
          
          updateToolCall(toolCallId, { 
            state: 'error', 
            error: errorMessage 
          });
        }
        
        // Clear the map after handling
        this.pendingToolCalls.clear();
      }
      return this.fullResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error('Stream error:', error);
      // Mark any pending tool calls as failed so UI doesn't show success
      if (this.pendingToolCalls.size > 0) {
        for (const [toolCallId] of this.pendingToolCalls) {
          updateToolCall(toolCallId, {
            state: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        this.pendingToolCalls.clear();
      }
      // When nested (subagent), update parent tool call instead of global state
      // to avoid unblocking the chat input while Director is still waiting
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (this.parentToolCallId) {
        updateToolCall(this.parentToolCallId, {
          state: 'error',
          error: errorMsg,
          output: { success: false, error: errorMsg }
        });
      } else {
        setStreamingError(`Error: ${errorMsg}`);
      }
      throw error;
    }
  }
}

