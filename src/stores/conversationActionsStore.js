import { generateText } from 'ai';
import { createModelInstance } from '@/utils/modelUtils';
import { getDirectorById, $activeDirectorAgent } from './directorAgentsStore';

// Metadata store
import {
  createConversationMetadata,
  deleteConversationMetadata,
  getMetadataById,
  incrementMessageCount,
  updateSummary,
  getMetadataByDirector
} from './conversationsMetadataStore';

// Active conversation store
import {
  $activeConversationId,
  loadActiveConversation,
  clearActiveConversation,
  addMessageToActive,
  getActiveMessages,
  $activeConversationFull
} from './activeConversationStore';

// Streaming store
import {
  startStreaming,
  finalizeStreaming,
  cancelStreaming,
  isStreaming,
  setPendingAction,
  clearPendingAction,
  getPendingAction,
  cancelStreamingWithMessage,
  setStreamingError,
  createAbortController,
  clearAbortController,
  isStreamAborting,
  resetAbortFlag
} from './streamingMessageStore';

// Messages storage utilities
import {
  deleteMessagesFromStorage,
  saveMessagesToStorage,
  loadMessagesFromStorage
} from '@/utils/messagesStorageUtils';

// Streaming utilities
import { StreamHandler } from '@/utils/streamingMessageUtils';

/**
 * Conversation Actions Store (V2)
 * Orchestrates all conversation-related actions
 * Coordinates between metadata, active conversation, and streaming stores
 */

/**
 * Creates a new conversation
 * @param directorAgentId - The director agent ID
 * @returns The new conversation ID
 */
export const createNewConversation = async (directorAgentId) => {
  // 1. Create metadata
  const conversationId = createConversationMetadata(directorAgentId);

  // 2. Create empty messages storage
  saveMessagesToStorage(conversationId, []);

  // 3. Load as active conversation
  loadActiveConversation(conversationId);

  // 4. Add welcome message from assistant
  addMessageToActive({
    role: 'assistant',
    content: '¡Hola! ¿En qué puedo ayudarte hoy?'
  });

  // 5. Increment message count for welcome message
  incrementMessageCount(conversationId);

  return conversationId;
};

/**
 * Sets a conversation as active and loads its messages
 * @param conversationId - The conversation ID
 */
export const setActiveConversation = (conversationId) => {
  const metadata = getMetadataById(conversationId);

  if (!metadata) {
    console.error('Conversation metadata not found');
    return;
  }

  // Load conversation (loads messages from storage into active atom)
  loadActiveConversation(conversationId);
};

/**
 * Sends a user message and streams the assistant's response
 * @param text - The user's message text
 */
export const sendUserMessage = async (text, hidden = false) => {
  const activeConversation = $activeConversationFull.get();
  const activeDirectorAgent = $activeDirectorAgent.get();

  if (!activeConversation || !activeDirectorAgent) {
    console.error('No active conversation or director agent');
    return;
  }

  try {
    // 1. Add user message to active conversation
    const userMessageId = addMessageToActive({
      role: 'user',
      content: text,
      hidden: hidden
    });

    if (!userMessageId) {
      console.error('Failed to add user message');
      return;
    }

    // Increment message count
    incrementMessageCount(activeConversation.id);

    // 2. Get the director agent instance
    const director = getDirectorById(activeDirectorAgent);
    if (!director?.instance) {
      console.error('Director agent not initialized');
      return;
    }

    // 3. Generate message ID for assistant response
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 4. Start streaming
    startStreaming(assistantMessageId);

    // 5. Create AbortController for this stream
    const abortController = createAbortController();

    // 6. Prepare messages for the agent
    const currentMessages = getActiveMessages();
    const agentMessages = currentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the new user message to agent context
    agentMessages.push({
      role: 'user',
      content: text
    });

    // 7. Stream response from agent
    const stream = await director.instance.stream({
      messages: agentMessages,
      abortSignal: abortController.signal
    });

    // 8. Handle stream processing
    const streamHandler = new StreamHandler(stream.fullStream);
    await streamHandler.handleStream();

    // 9. Check if stream was aborted (even if no error was thrown)
    if (isStreamAborting()) {
      resetAbortFlag();
      clearAbortController();
      
      // Finalize with cancellation note
      const cancelMessage = finalizeStreaming();
      if (cancelMessage) {
        const messageContent = cancelMessage.content || '';
        addMessageToActive({
          role: 'assistant',
          content: messageContent + '\n\n⚠️ _Cancelado por el usuario_',
          toolCalls: cancelMessage.toolCalls
        });
        incrementMessageCount(activeConversation.id);
      }
      return;
    }

    // 10. Clear AbortController after successful completion
    clearAbortController();

    // 11. Finalize streaming
    const finalMessage = finalizeStreaming();

    if (finalMessage) {
      // Add to active conversation
      addMessageToActive({
        role: 'assistant',
        content: finalMessage.content,
        toolCalls: finalMessage.toolCalls
      });

      // Increment message count
      incrementMessageCount(activeConversation.id);
    }

    // 12. Generate summary after first exchange if not exists
    if (!activeConversation.summary && currentMessages.length <= 2) {
      // Wait a bit for the message to be fully added
      setTimeout(() => {
        generateConversationSummary(activeConversation.id);
      }, 1000);
    }
  } catch (error) {
    console.error('Error sending message:', error);

    // Clear AbortController on error
    clearAbortController();
    
    // Check if it was an abort
    const wasAborting = isStreamAborting();
    resetAbortFlag(); // Always reset the flag

    // Handle AbortError (user cancelled)
    // Check for both 'AbortError' name and message containing 'abort' or if flag was set
    const isAborted = wasAborting || (error instanceof Error && 
      (error.name === 'AbortError' || 
       error.message?.toLowerCase().includes('abort') ||
       error.message?.toLowerCase().includes('cancel')));
    
    if (isAborted) {
      // Finalize with cancellation note
      const cancelMessage = finalizeStreaming();
      
      if (cancelMessage) {
        const messageContent = cancelMessage.content || '';
        addMessageToActive({
          role: 'assistant',
          content: messageContent + '\n\n⚠️ _Cancelado por el usuario_',
          toolCalls: cancelMessage.toolCalls
        });
        incrementMessageCount(activeConversation.id);
      }
      return; // Exit without showing error
    }

    // Handle real errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setStreamingError(`Error: ${errorMessage}`);
    
    // Clear error and cancel streaming after 3 seconds
    setTimeout(() => {
      cancelStreaming();
    }, 3000);
  }
};

/**
 * Generates a summary for a conversation
 * @param conversationId - The conversation ID
 */
export const generateConversationSummary = async (conversationId) => {
  const metadata = getMetadataById(conversationId);

  if (!metadata || metadata.summary || metadata.messageCount < 2) {
    return;
  }

  try {
    // Load messages for this conversation (they might not be in active if user switched)
    const activeId = $activeConversationId.get();
    let messages;

    if (activeId === conversationId) {
      // Messages are in active conversation
      messages = getActiveMessages();
    } else {
      // Need to load from storage
      messages = loadMessagesFromStorage(conversationId);
    }

    if (messages.length < 2) {
      return;
    }

    const model = createModelInstance();

    // Get first few messages to generate summary
    const firstMessages = messages.slice(0, 4);
    const messagesText = firstMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const { text } = await generateText({
      model,
      prompt: `Generate a brief summary (max 50 words) of this conversation:\n\n${messagesText}\n\nSummary:`
    });

    // Update metadata with summary
    updateSummary(conversationId, text.trim());
  } catch (error) {
    console.error('Failed to generate conversation summary:', error);
  }
};

/**
 * Deletes a conversation (metadata and messages)
 * @param conversationId - The conversation ID
 */
export const deleteConversation = (conversationId) => {
  // 1. Delete messages from storage
  deleteMessagesFromStorage(conversationId);

  // 2. Delete metadata
  deleteConversationMetadata(conversationId);

  // 3. If deleting active conversation, clear active
  const activeId = $activeConversationId.get();
  if (activeId === conversationId) {
    clearActiveConversation();
  }
};

/**
 * Gets conversations for a specific director
 * Returns only metadata (lightweight)
 * @param directorAgentId - The director agent ID
 * @returns Array of conversation metadata
 */
export const getConversationsForDirector = (directorAgentId) => {
  return getMetadataByDirector(directorAgentId);
};

/**
 * Attempts to switch conversation, checking for active streaming first
 * Returns true if switched immediately, false if pending user confirmation
 */
export const trySetActiveConversation = (conversationId) => {
  if (isStreaming()) {
    // Set pending action and show dialog
    setPendingAction({
      type: 'switch_conversation',
      data: { conversationId }
    });
    return false;
  }
  
  // No streaming, switch immediately
  setActiveConversation(conversationId);
  return true;
};

/**
 * Attempts to create new conversation, checking for active streaming first
 * Returns true if created immediately, false if pending user confirmation
 */
export const tryCreateNewConversation = async (directorAgentId) => {
  if (isStreaming()) {
    // Set pending action and show dialog
    setPendingAction({
      type: 'new_conversation',
      data: { directorAgentId }
    });
    return false;
  }
  
  // No streaming, create immediately
  await createNewConversation(directorAgentId);
  return true;
};

/**
 * Handles user continuing to wait for streaming (cancels the pending action)
 */
export const handleContinueStreaming = () => {
  clearPendingAction();
};

/**
 * Handles user cancelling the streaming and executing the pending action
 */
export const handleCancelStreaming = () => {
  const currentConversationId = $activeConversationId.get();
  const wasStreaming = isStreaming();
  
  // Cancel streaming if still active
  if (wasStreaming) {
    cancelStreamingWithMessage();
    
    // Add cancellation message to the conversation where streaming was happening
    if (currentConversationId) {
      const cancellationMessage = JSON.stringify({
        text: '⚠️ Message cancelled by user'
      });
      
      addMessageToActive({
        role: 'assistant',
        content: cancellationMessage
      });
      
      incrementMessageCount(currentConversationId);
    }
  } else {
    // Streaming already finished naturally
    // Check if the message was added to the conversation
    // If it was, we can proceed with the action
    // The message should already be in the conversation from finalizeStreaming()
    console.log('Streaming finished naturally, proceeding with pending action');
  }
  
  // Execute the pending action
  const action = getPendingAction();
  clearPendingAction();
  
  if (action) {
    switch (action.type) {
      case 'switch_conversation':
        if (action.data?.conversationId) {
          setActiveConversation(action.data.conversationId);
        }
        break;
      
      case 'new_conversation':
        if (action.data?.directorAgentId) {
          createNewConversation(action.data.directorAgentId);
        }
        break;
      
      case 'reload':
        // For reload, we just cancel and add the message if was streaming
        // The actual reload is handled by the browser
        break;
    }
  }
};

