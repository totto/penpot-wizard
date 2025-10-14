/**
 * Performance measurement utilities for comparing V1 vs V2
 */

/**
 * Measures current memory usage in MB
 * Only works in browsers that support performance.memory (Chrome/Edge)
 */
export const measureMemoryUsage = (): number => {
  if ('memory' in performance && performance.memory) {
    const memory = performance.memory as {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
  }
  return 0;
};

/**
 * Measures localStorage usage for V1 and V2 separately
 * Returns size in KB
 */
export const measureLocalStorageSize = (): { v1: number; v2: number } => {
  let v1Size = 0;
  let v2Size = 0;

  try {
    // V1: All conversations with messages in one key
    const conversations = localStorage.getItem('conversations');
    if (conversations) {
      v1Size = new Blob([conversations]).size / 1024; // KB
    }

    // V2: Metadata + individual message stores
    const metadata = localStorage.getItem('conversationsMetadata');
    if (metadata) {
      v2Size += new Blob([metadata]).size / 1024; // KB
    }

    // Sum all messages_v2_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('messages_v2_')) {
        const value = localStorage.getItem(key);
        if (value) {
          v2Size += new Blob([value]).size / 1024; // KB
        }
      }
    }
  } catch (error) {
    console.error('Error measuring localStorage size:', error);
  }

  return { v1: v1Size, v2: v2Size };
};

/**
 * Get total number of conversations in V1
 */
export const getV1ConversationsCount = (): number => {
  try {
    const conversations = localStorage.getItem('conversations');
    if (conversations) {
      const parsed = JSON.parse(conversations);
      return Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch (error) {
    console.error('Error reading V1 conversations:', error);
  }
  return 0;
};

/**
 * Get total number of conversations in V2
 */
export const getV2ConversationsCount = (): number => {
  try {
    const metadata = localStorage.getItem('conversationsMetadata');
    if (metadata) {
      const parsed = JSON.parse(metadata);
      return Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch (error) {
    console.error('Error reading V2 metadata:', error);
  }
  return 0;
};

/**
 * Get total number of messages across all conversations in V1
 */
export const getV1TotalMessages = (): number => {
  try {
    const conversations = localStorage.getItem('conversations');
    if (conversations) {
      const parsed = JSON.parse(conversations);
      if (Array.isArray(parsed)) {
        return parsed.reduce((total, conv) => {
          return total + (Array.isArray(conv.messages) ? conv.messages.length : 0);
        }, 0);
      }
    }
  } catch (error) {
    console.error('Error counting V1 messages:', error);
  }
  return 0;
};

/**
 * Get total number of messages across all conversations in V2
 */
export const getV2TotalMessages = (): number => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('messages_v2_')) {
        const value = localStorage.getItem(key);
        if (value) {
          const messages = JSON.parse(value);
          if (Array.isArray(messages)) {
            total += messages.length;
          }
        }
      }
    }
    return total;
  } catch (error) {
    console.error('Error counting V2 messages:', error);
  }
  return 0;
};

