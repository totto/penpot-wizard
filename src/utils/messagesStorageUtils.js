/**
 * Utilities for managing messages in localStorage
 * V2 stores messages separately from conversation metadata
 * This allows loading conversation lists without loading all messages
 */

const MESSAGES_PREFIX = 'messages_v2_';

/**
 * Saves all messages for a conversation to localStorage
 * @param conversationId - The conversation ID
 * @param messages - Array of messages to save
 */
export const saveMessagesToStorage = (conversationId, messages) => {
  try {
    const key = `${MESSAGES_PREFIX}${conversationId}`;
    const serialized = JSON.stringify(
      messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }))
    );
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Error saving messages to storage:', error);
    // Handle QuotaExceededError or other storage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Consider cleaning old conversations.');
    }
  }
};

/**
 * Loads all messages for a conversation from localStorage
 * @param conversationId - The conversation ID
 * @returns Array of messages, or empty array if not found
 */
export const loadMessagesFromStorage = (conversationId) => {
  try {
    const key = `${MESSAGES_PREFIX}${conversationId}`;
    const serialized = localStorage.getItem(key);
    
    if (!serialized) {
      return [];
    }
    
    const parsed = JSON.parse(serialized);
    
    // Deserialize and reconstruct Date objects
    return parsed.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.error('Error loading messages from storage:', error);
    return [];
  }
};

/**
 * Deletes all messages for a conversation from localStorage
 * @param conversationId - The conversation ID
 */
export const deleteMessagesFromStorage = (conversationId) => {
  try {
    const key = `${MESSAGES_PREFIX}${conversationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting messages from storage:', error);
  }
};

/**
 * Adds a single message to the end of a conversation in localStorage
 * This is more efficient than loading all messages, adding one, and saving all
 * @param conversationId - The conversation ID
 * @param message - The message to add
 */
export const addMessageToStorage = (conversationId, message) => {
  try {
    const messages = loadMessagesFromStorage(conversationId);
    messages.push(message);
    saveMessagesToStorage(conversationId, messages);
  } catch (error) {
    console.error('Error adding message to storage:', error);
  }
};

/**
 * Updates a specific message in localStorage
 * @param conversationId - The conversation ID
 * @param messageId - The ID of the message to update
 * @param content - The new content
 * @param isStreaming - Optional streaming flag
 */
export const updateMessageInStorage = (
  conversationId,
  messageId,
  content,
  isStreaming
) => {
  try {
    const messages = loadMessagesFromStorage(conversationId);
    const updatedMessages = messages.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            content,
            ...(isStreaming !== undefined && { isStreaming })
          }
        : msg
    );
    saveMessagesToStorage(conversationId, updatedMessages);
  } catch (error) {
    console.error('Error updating message in storage:', error);
  }
};

/**
 * Gets the count of messages for a conversation without loading them all
 * Useful for metadata
 * @param conversationId - The conversation ID
 * @returns Number of messages
 */
export const getMessageCount = (conversationId) => {
  try {
    const messages = loadMessagesFromStorage(conversationId);
    return messages.length;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
};

/**
 * Checks if messages exist for a conversation
 * @param conversationId - The conversation ID
 * @returns True if messages exist
 */
export const hasMessages = (conversationId) => {
  const key = `${MESSAGES_PREFIX}${conversationId}`;
  return localStorage.getItem(key) !== null;
};

/**
 * Gets all conversation IDs that have messages in V2 format
 * Useful for debugging or migration
 * @returns Array of conversation IDs
 */
export const getAllV2ConversationIds = () => {
  const conversationIds = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(MESSAGES_PREFIX)) {
        const conversationId = key.substring(MESSAGES_PREFIX.length);
        conversationIds.push(conversationId);
      }
    }
  } catch (error) {
    console.error('Error getting V2 conversation IDs:', error);
  }
  
  return conversationIds;
};

/**
 * Cleans up orphaned message stores (messages without corresponding metadata)
 * Should be called periodically or during app initialization
 * @param validConversationIds - Array of valid conversation IDs from metadata
 * @returns Number of orphaned stores cleaned
 */
export const cleanupOrphanedMessages = (validConversationIds) => {
  let cleanedCount = 0;
  
  try {
    const allV2Ids = getAllV2ConversationIds();
    const validIdsSet = new Set(validConversationIds);
    
    allV2Ids.forEach(id => {
      if (!validIdsSet.has(id)) {
        deleteMessagesFromStorage(id);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} orphaned message stores`);
    }
  } catch (error) {
    console.error('Error cleaning orphaned messages:', error);
  }
  
  return cleanedCount;
};

