import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { generateText } from 'ai';
import { createModelInstance } from '@/utils/modelUtils';
import { getDirectorById, $activeDirectorAgent } from './directorAgentsStore';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  directorAgentId: string;
  messages: Message[];
  summary: string | null;
  createdAt: Date;
}

// Persistent atoms for conversations
export const $conversations = persistentAtom<Conversation[]>('conversations', [], {
  encode: (conversations: Conversation[]) => JSON.stringify(conversations.map(conv => ({
    ...conv,
    messages: conv.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    })),
    createdAt: conv.createdAt.toISOString()
  }))),
  decode: (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return parsed.map((conv: any) => ({
        ...conv,
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        createdAt: new Date(conv.createdAt)
      }));
    } catch {
      return [];
    }
  }
});

export const $activeConversationId = persistentAtom<string | undefined>('activeConversationId', undefined);

// Computed atoms
export const $activeConversation = computed(
  [$conversations, $activeConversationId],
  (conversations, activeId) => {
    if (!activeId) return null;
    return conversations.find(conv => conv.id === activeId) || null;
  }
);

export const $conversationHistory = computed(
  [$conversations, $activeConversationId],
  (conversations, activeId) => {
    return conversations
      .filter(conv => conv.id !== activeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
);

// Action functions
export const createNewConversation = (directorAgentId: string): string => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newConversation: Conversation = {
    id: conversationId,
    directorAgentId,
    messages: [],
    summary: null,
    createdAt: new Date()
  };
  
  const currentConversations = $conversations.get();
  $conversations.set([newConversation, ...currentConversations]);
  $activeConversationId.set(conversationId);
  generateGreetingMessage(conversationId);
  return conversationId;
};

// Function to generate greeting by sending a message to the DirectorAgent
const generateGreetingMessage = async (conversationId: string): Promise<void> => {
  const conversations = $conversations.get();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation) {
    console.error('Conversation not found for greeting generation');
    return;
  }
  
  const director = getDirectorById(conversation.directorAgentId);
  if (!director?.instance) {
    console.error('Director agent not initialized for greeting generation');
    return;
  }
  
  try {    
    // Prepare messages for the agent (just the hello message)
    const agentMessages = [{
      role: 'user' as const,
      content: `
        Your first task is present yourself to the user in a friendly way, and then ask the user to tell you what they want to do.
        Always call the user by his name.
      `
    }];
    
    // Add the assistant's greeting response
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: ''
    });

    if (!assistantMessageId) {
      throw new Error('Assistant message ID not found');
    }

    // Set message as streaming
    updateMessage(assistantMessageId, '', true);

    // Stream response from agent
    const stream = await director.instance.stream({
      messages: agentMessages
    });

    let fullResponse = '';
    let toolCalls = [];
    
    // Handle both text stream and tool calls
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.text
        updateMessage(assistantMessageId, fullResponse, true)
      } else if (chunk.type === 'tool-call') {
        toolCalls.push(chunk)
        // You can add UI feedback for tool calls here if needed
      } else if (chunk.type === 'tool-result') {
        // Handle tool results if needed
      }
    }

    // Mark streaming as complete
    updateMessage(assistantMessageId, fullResponse, false);    
  } catch (error) {
    console.error('Error generating greeting message:', error);
  }
};

export const setActiveConversation = (conversationId: string) => {
  const conversations = $conversations.get();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (conversation) {
    $activeConversationId.set(conversationId);
  }
};

export const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
  const activeId = $activeConversationId.get();
  if (!activeId) return;
  
  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    isStreaming: false
  };
  
  const conversations = $conversations.get();
  const updatedConversations = conversations.map(conv => {
    if (conv.id === activeId) {
      return {
        ...conv,
        messages: [...conv.messages, newMessage]
      };
    }
    return conv;
  });
  
  $conversations.set(updatedConversations);
  return newMessage.id;
};

export const updateMessage = (messageId: string, content: string, isStreaming?: boolean) => {
  const activeId = $activeConversationId.get();
  if (!activeId) return;
  
  const conversations = $conversations.get();
  const updatedConversations = conversations.map(conv => {
    if (conv.id === activeId) {
      return {
        ...conv,
        messages: conv.messages.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            content,
            ...(isStreaming !== undefined && { isStreaming })
          } : msg
        )
      };
    }
    return conv;
  });
  
  $conversations.set(updatedConversations);
};

export const generateConversationSummary = async (conversationId: string) => {
  const conversations = $conversations.get();
  const conversation = conversations.find(conv => conv.id === conversationId);
  
  if (!conversation || conversation.summary || conversation.messages.length < 2) {
    return;
  }
  
  try {
    const model = createModelInstance();
    
    // Get first few messages to generate summary
    const firstMessages = conversation.messages.slice(0, 4);
    const messagesText = firstMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    const { text } = await generateText({
      model,
      prompt: `Generate a brief summary (max 50 words) of this conversation:\n\n${messagesText}\n\nSummary:`
    });
    
    // Update conversation with summary
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          summary: text.trim()
        };
      }
      return conv;
    });
    
    $conversations.set(updatedConversations);
  } catch (error) {
    console.error('Failed to generate conversation summary:', error);
  }
};

export const deleteConversation = (conversationId: string) => {
  const conversations = $conversations.get();
  const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
  
  $conversations.set(updatedConversations);
  
  // If deleting active conversation, clear active
  if ($activeConversationId.get() === conversationId) {
    $activeConversationId.set(undefined);
  }
};

// Helper function to get conversations for a specific director
export const getConversationsForDirector = (directorAgentId: string) => {
  const conversations = $conversations.get();
  return conversations
    .filter(conv => conv.directorAgentId === directorAgentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const sendUserMessage = async (text: string): Promise<void> => {
  const activeConversation = $activeConversation.get();
  const activeDirectorAgent = $activeDirectorAgent.get();
  
  if (!activeConversation || !activeDirectorAgent) {
    console.error('No active conversation or director agent');
    return;
  }
  
  try {
    // Add user message to conversation
    addMessage({
      role: 'user',
      content: text
    });
    
    // Get the director agent instance
    const director = getDirectorById(activeDirectorAgent);
    if (!director?.instance) {
      console.error('Director agent not initialized');
      return;
    }
    
    // Add assistant message placeholder
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: ''
    });
    
    if (!assistantMessageId) {
      console.error('Failed to add assistant message');
      return;
    }
    
    // Set message as streaming
    updateMessage(assistantMessageId, '', true);
    
    // Prepare messages for the agent (convert to AI SDK format, excluding isStreaming)
    const agentMessages = activeConversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the new user message
    agentMessages.push({
      role: 'user',
      content: text
    });
    
    // Stream response from agent
    const stream = await director.instance.stream({
      messages: agentMessages
    });
    
    let fullResponse = '';
    let toolCalls = [];
    
    // Handle both text stream and tool calls
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta') {
        fullResponse += chunk.text;
        updateMessage(assistantMessageId, fullResponse, true);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk);
        toolCalls.push(chunk);
        // You can add UI feedback for tool calls here if needed
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result:', chunk);
        // Handle tool results if needed
      }
    }

    // Mark streaming as complete
    updateMessage(assistantMessageId, fullResponse, false);
    
    // Generate summary after first exchange if not exists
    if (!activeConversation.summary && activeConversation.messages.length === 1) {
      // Wait a bit for the message to be fully added
      setTimeout(() => {
        generateConversationSummary(activeConversation.id);
      }, 1000);
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    const activeConversation = $activeConversation.get();
    const content = JSON.stringify({'text': 'Sorry, I encountered an error. Please try again.'});
    const streamingMessageId = activeConversation ? activeConversation.messages.find(msg => msg.role === 'assistant' && msg.isStreaming)?.id : null;
    console.log('streamingMessageId', streamingMessageId)
    if (streamingMessageId) {
      updateMessage(streamingMessageId, content, false);
    } else {
      addMessage({
        role: 'assistant',
        content
      });
    }


  }
};
