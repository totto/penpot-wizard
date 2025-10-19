import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type { ConversationMetadata } from '@/types/types';

/**
 * Store for conversation metadata (V2)
 * Stores only metadata without messages, reducing memory footprint
 * Messages are stored separately in localStorage via messagesStorageUtils
 */

export const $conversationsMetadata = persistentAtom<ConversationMetadata[]>(
  'conversationsMetadata',
  [],
  {
    encode: (metadata: ConversationMetadata[]) =>
      JSON.stringify(
        metadata.map((conv: ConversationMetadata) => ({
          ...conv,
          createdAt: conv.createdAt.toISOString()
        }))
      ),
    decode: (value: string) => {
      try {
        const parsed = JSON.parse(value);
        return parsed.map((conv: ConversationMetadata) => ({
          ...conv,
          createdAt: new Date(conv.createdAt)
        }));
      } catch {
        return [];
      }
    }
  }
);

/**
 * Computed atom for conversation metadata history
 * Returns all metadata sorted by creation date (newest first)
 */
export const $conversationMetadataHistory = computed(
  $conversationsMetadata,
  (metadata) => {
    return [...metadata].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
);

/**
 * Creates new conversation metadata
 * Note: This only creates metadata, not the actual messages store
 * @param directorAgentId - The director agent ID
 * @returns The new conversation ID
 */
export const createConversationMetadata = (directorAgentId: string): string => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const newMetadata: ConversationMetadata = {
    id: conversationId,
    directorAgentId,
    summary: null,
    createdAt: new Date(),
    messageCount: 0
  };

  const currentMetadata = $conversationsMetadata.get();
  $conversationsMetadata.set([newMetadata, ...currentMetadata]);

  return conversationId;
};

/**
 * Updates conversation metadata
 * @param conversationId - The conversation ID
 * @param updates - Partial updates to apply
 */
export const updateConversationMetadata = (
  conversationId: string,
  updates: Partial<Omit<ConversationMetadata, 'id' | 'createdAt'>>
): void => {
  const metadata = $conversationsMetadata.get();
  const updatedMetadata = metadata.map(conv =>
    conv.id === conversationId ? { ...conv, ...updates } : conv
  );
  $conversationsMetadata.set(updatedMetadata);
};

/**
 * Deletes conversation metadata
 * Note: This doesn't delete the messages from storage
 * Use deleteMessagesFromStorage() separately if needed
 * @param conversationId - The conversation ID
 */
export const deleteConversationMetadata = (conversationId: string): void => {
  const metadata = $conversationsMetadata.get();
  const updatedMetadata = metadata.filter(conv => conv.id !== conversationId);
  $conversationsMetadata.set(updatedMetadata);
};

/**
 * Gets metadata for a specific conversation
 * @param conversationId - The conversation ID
 * @returns Metadata or undefined if not found
 */
export const getMetadataById = (conversationId: string): ConversationMetadata | undefined => {
  const metadata = $conversationsMetadata.get();
  return metadata.find(conv => conv.id === conversationId);
};

/**
 * Gets all metadata for a specific director agent
 * @param directorAgentId - The director agent ID
 * @returns Array of metadata sorted by date (newest first)
 */
export const getMetadataByDirector = (directorAgentId: string): ConversationMetadata[] => {
  const metadata = $conversationsMetadata.get();
  return metadata
    .filter(conv => conv.directorAgentId === directorAgentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

/**
 * Increments the message count for a conversation
 * Useful when adding messages
 * @param conversationId - The conversation ID
 */
export const incrementMessageCount = (conversationId: string): void => {
  const metadata = $conversationsMetadata.get();
  const updatedMetadata = metadata.map(conv =>
    conv.id === conversationId
      ? { ...conv, messageCount: conv.messageCount + 1 }
      : conv
  );
  $conversationsMetadata.set(updatedMetadata);
};

/**
 * Sets the exact message count for a conversation
 * @param conversationId - The conversation ID
 * @param count - The message count
 */
export const setMessageCount = (conversationId: string, count: number): void => {
  updateConversationMetadata(conversationId, { messageCount: count });
};

/**
 * Updates the summary for a conversation
 * @param conversationId - The conversation ID
 * @param summary - The summary text
 */
export const updateSummary = (conversationId: string, summary: string): void => {
  updateConversationMetadata(conversationId, { summary });
};

