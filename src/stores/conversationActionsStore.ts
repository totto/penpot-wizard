import { generateText } from 'ai';
import { createModelInstance } from '@/utils/modelUtils';
import { getDirectorById, $activeDirectorAgent } from './directorAgentsStore';
import type { Message } from '@/types/types';

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
  updateStreamingContent,
  finalizeStreaming,
  cancelStreaming,
  isStreaming,
  setPendingAction,
  clearPendingAction,
  getPendingAction,
  cancelStreamingWithMessage
} from './streamingMessageStore';

// Messages storage utilities
import {
  deleteMessagesFromStorage,
  saveMessagesToStorage
} from '@/utils/messagesStorageUtils';

/**
 * Conversation Actions Store (V2)
 * Orchestrates all conversation-related actions
 * Coordinates between metadata, active conversation, and streaming stores
 */

/**
 * Creates a new conversation and generates a greeting message
 * @param directorAgentId - The director agent ID
 * @returns The new conversation ID
 */
export const createNewConversationV2 = async (directorAgentId: string): Promise<string> => {
  // 1. Create metadata
  const conversationId = createConversationMetadata(directorAgentId);

  // 2. Create empty messages storage
  saveMessagesToStorage(conversationId, []);

  // 3. Load as active conversation
  loadActiveConversation(conversationId);

  // 4. Generate greeting message
  await generateGreetingMessageV2(conversationId);

  return conversationId;
};

/**
 * Generates a greeting message for a new conversation
 * @param conversationId - The conversation ID
 */
const generateGreetingMessageV2 = async (conversationId: string): Promise<void> => {
  const metadata = getMetadataById(conversationId);

  if (!metadata) {
    console.error('Conversation metadata not found for greeting generation');
    return;
  }

  const director = getDirectorById(metadata.directorAgentId);
  if (!director?.instance) {
    console.error('Director agent not initialized for greeting generation');
    return;
  }

  try {
    // Prepare messages for the agent (just the hello message)
    const agentMessages = [
      {
        role: 'user' as const,
        content: `
        Your first task is present yourself to the user in a friendly way, and then ask the user to tell you what they want to do.
        Always call the user by his name.
      `
      }
    ];

    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start streaming
    startStreaming(messageId);

    // Stream response from agent
    const stream = await director.instance.stream({
      messages: agentMessages
    });

    let fullResponse = '';

    // Handle both text stream and tool calls
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.text;
        updateStreamingContent(fullResponse);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call during greeting:', chunk);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result during greeting:', chunk);
      }
    }

    // Finalize streaming
    const finalMessage = finalizeStreaming();

    if (finalMessage) {
      // Add to active conversation
      addMessageToActive({
        role: 'assistant',
        content: finalMessage.content
      });

      // Increment message count in metadata
      incrementMessageCount(conversationId);
    }
  } catch (error) {
    console.error('Error generating greeting message:', error);
    cancelStreaming();
  }
};

/**
 * Sets a conversation as active and loads its messages
 * @param conversationId - The conversation ID
 */
export const setActiveConversationV2 = (conversationId: string): void => {
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
export const sendUserMessageV2 = async (text: string): Promise<void> => {
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
      content: text
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

    // 5. Prepare messages for the agent
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

    // 6. Stream response from agent
    const stream = await director.instance.stream({
      messages: agentMessages
    });

    let fullResponse = '';

    // 7. Handle stream chunks
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.text;
        updateStreamingContent(fullResponse);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result:', chunk);
      }
    }

    // 8. Finalize streaming
    const finalMessage = finalizeStreaming();

    if (finalMessage) {
      // Add to active conversation
      addMessageToActive({
        role: 'assistant',
        content: finalMessage.content
      });

      // Increment message count
      incrementMessageCount(activeConversation.id);
    }

    // 9. Generate summary after first exchange if not exists
    if (!activeConversation.summary && currentMessages.length <= 2) {
      // Wait a bit for the message to be fully added
      setTimeout(() => {
        generateConversationSummaryV2(activeConversation.id);
      }, 1000);
    }
  } catch (error) {
    console.error('Error sending message:', error);

    // Handle error - cancel streaming and show error message
    cancelStreaming();

    const errorContent = JSON.stringify({
      text: 'Sorry, I encountered an error. Please try again.'
    });

    // Add error message
    addMessageToActive({
      role: 'assistant',
      content: errorContent
    });

    // Increment message count
    if (activeConversation) {
      incrementMessageCount(activeConversation.id);
    }
  }
};

/**
 * Generates a summary for a conversation
 * @param conversationId - The conversation ID
 */
export const generateConversationSummaryV2 = async (conversationId: string): Promise<void> => {
  const metadata = getMetadataById(conversationId);

  if (!metadata || metadata.summary || metadata.messageCount < 2) {
    return;
  }

  try {
    // Load messages for this conversation (they might not be in active if user switched)
    const activeId = $activeConversationId.get();
    let messages: Message[];

    if (activeId === conversationId) {
      // Messages are in active conversation
      messages = getActiveMessages();
    } else {
      // Need to load from storage
      const { loadMessagesFromStorage } = await import('@/utils/messagesStorageUtils');
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
export const deleteConversationV2 = (conversationId: string): void => {
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
export const getConversationsForDirectorV2 = (directorAgentId: string) => {
  return getMetadataByDirector(directorAgentId);
};

/**
 * Attempts to switch conversation, checking for active streaming first
 * Returns true if switched immediately, false if pending user confirmation
 */
export const trySetActiveConversationV2 = (conversationId: string): boolean => {
  if (isStreaming()) {
    // Set pending action and show dialog
    setPendingAction({
      type: 'switch_conversation',
      data: { conversationId }
    });
    return false;
  }
  
  // No streaming, switch immediately
  setActiveConversationV2(conversationId);
  return true;
};

/**
 * Attempts to create new conversation, checking for active streaming first
 * Returns true if created immediately, false if pending user confirmation
 */
export const tryCreateNewConversationV2 = async (directorAgentId: string): Promise<boolean> => {
  if (isStreaming()) {
    // Set pending action and show dialog
    setPendingAction({
      type: 'new_conversation',
      data: { directorAgentId }
    });
    return false;
  }
  
  // No streaming, create immediately
  await createNewConversationV2(directorAgentId);
  return true;
};

/**
 * Handles user continuing to wait for streaming (cancels the pending action)
 */
export const handleContinueStreaming = (): void => {
  clearPendingAction();
};

/**
 * Handles user cancelling the streaming and executing the pending action
 */
export const handleCancelStreaming = (): void => {
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
          setActiveConversationV2(action.data.conversationId);
        }
        break;
      
      case 'new_conversation':
        if (action.data?.directorAgentId) {
          createNewConversationV2(action.data.directorAgentId);
        }
        break;
      
      case 'reload':
        // For reload, we just cancel and add the message if was streaming
        // The actual reload is handled by the browser
        break;
    }
  }
};

