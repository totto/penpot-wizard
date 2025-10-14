import { atom } from 'nanostores';
import type { StreamingMessage } from '@/types/types';

/**
 * Store for the streaming message (V2)
 * Manages the message currently being streamed from the AI
 * NOT persisted - ephemeral state only
 * 
 * This separation allows ChatMessages to render:
 * - Static message history (no re-renders)
 * - Streaming message separately (only this re-renders)
 */

/**
 * The current streaming message
 * Null when no message is streaming
 */
export const $streamingMessage = atom<StreamingMessage | null>(null);

/**
 * Pending action to execute after user confirms cancellation
 */
type PendingAction = {
  type: 'switch_conversation' | 'new_conversation' | 'reload';
  data?: any;
} | null;

export const $pendingAction = atom<PendingAction>(null);

/**
 * Whether to show the cancel dialog
 */
export const $showCancelDialog = atom<boolean>(false);

/**
 * Starts a new streaming message
 * @param messageId - The ID for the new message
 */
export const startStreaming = (messageId: string): void => {
  const newStreamingMessage: StreamingMessage = {
    id: messageId,
    role: 'assistant',
    content: '',
    isStreaming: true
  };
  
  $streamingMessage.set(newStreamingMessage);
};

/**
 * Updates the content of the streaming message
 * @param content - The new content (full content, not delta)
 */
export const updateStreamingContent = (content: string): void => {
  const current = $streamingMessage.get();
  
  if (!current) {
    console.warn('Attempted to update streaming content when no message is streaming');
    return;
  }
  
  $streamingMessage.set({
    ...current,
    content
  });
};

/**
 * Finalizes the streaming message
 * Returns the final message and clears the streaming state
 * The caller is responsible for adding this message to the conversation
 * @returns The final streaming message, or null if no message was streaming
 */
export const finalizeStreaming = (): StreamingMessage | null => {
  const message = $streamingMessage.get();
  
  if (!message) {
    return null;
  }
  
  // Create final message with streaming flag set to false
  const finalMessage: StreamingMessage = {
    ...message,
    isStreaming: false
  };
  
  // Clear streaming state
  $streamingMessage.set(null);
  
  return finalMessage;
};

/**
 * Cancels streaming without finalizing
 * Used when streaming is interrupted or errors occur
 */
export const cancelStreaming = (): void => {
  $streamingMessage.set(null);
};

/**
 * Checks if a message is currently streaming
 * @returns True if streaming is active
 */
export const isStreaming = (): boolean => {
  const message = $streamingMessage.get();
  return message !== null && message.isStreaming;
};

/**
 * Gets the current streaming message
 * @returns The streaming message or null
 */
export const getStreamingMessage = (): StreamingMessage | null => {
  return $streamingMessage.get();
};

/**
 * Gets the current streaming content
 * @returns The content string, or empty string if not streaming
 */
export const getStreamingContent = (): string => {
  const message = $streamingMessage.get();
  return message?.content || '';
};

/**
 * Gets the streaming message ID
 * @returns The message ID or undefined if not streaming
 */
export const getStreamingMessageId = (): string | undefined => {
  const message = $streamingMessage.get();
  return message?.id;
};

/**
 * Sets a pending action that will be executed after streaming is cancelled
 * @param action - The action to execute
 */
export const setPendingAction = (action: PendingAction): void => {
  $pendingAction.set(action);
  $showCancelDialog.set(true);
};

/**
 * Clears the pending action and hides dialog
 */
export const clearPendingAction = (): void => {
  $pendingAction.set(null);
  $showCancelDialog.set(false);
};

/**
 * Gets the current pending action
 */
export const getPendingAction = (): PendingAction => {
  return $pendingAction.get();
};

/**
 * Cancels streaming and adds a cancellation message
 * Returns the conversation ID where the cancelled message should be added
 */
export const cancelStreamingWithMessage = (): { conversationId: string | null; messageId: string | null } => {
  const message = $streamingMessage.get();
  
  if (!message) {
    return { conversationId: null, messageId: null };
  }
  
  const messageId = message.id;
  
  // Clear streaming state
  $streamingMessage.set(null);
  
  // Return info so caller can add the cancellation message to the right conversation
  return { conversationId: null, messageId }; // conversationId will be determined by caller
};

