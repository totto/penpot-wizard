# State Management with Nanostores

## Table of Contents
- [Why Nanostores?](#why-nanostores)
- [Store Architecture](#store-architecture)
- [Settings Store](#settings-store)
- [Agent Stores](#agent-stores)
- [Conversation Stores](#conversation-stores)
- [Tools Store](#tools-store)
- [Penpot Store](#penpot-store)
- [Best Practices](#best-practices)

## Why Nanostores?

Penpot Wizard uses [nanostores](https://github.com/nanostores/nanostores) for state management instead of Redux, Zustand, or Context API.

### Advantages

**1. Tiny Size**
- Core: ~300 bytes minified
- No boilerplate
- Fast bundle size

**2. Simple API**
```typescript
// Create atom
const $count = atom(0);

// Subscribe in React
const count = useStore($count);

// Update
$count.set(5);
```

**3. Framework Agnostic**
- Works with React, Vue, Svelte, vanilla JS
- Easy to test
- No provider hell

**4. Built-in Persistence**
```typescript
import { persistentAtom } from '@nanostores/persistent';

const $apiKey = persistentAtom<string>('apiKey', '');
// Automatically synced with localStorage
```

**5. Computed Atoms**
```typescript
const $firstName = atom('John');
const $lastName = atom('Doe');

const $fullName = computed(
  [$firstName, $lastName],
  (first, last) => `${first} ${last}`
);
// Auto-updates when dependencies change
```

## Store Architecture

### Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SETTINGS STORE                       │
│  - API keys (persistent)                                │
│  - Model selection (persistent)                         │
│  - Available models (runtime)                           │
│  - Connection status (computed)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Triggers initialization when connected
                   │
    ┌──────────────┴────────────────┐
    │                               │
    ▼                               ▼
┌────────────────────┐    ┌──────────────────────┐
│   TOOLS STORE      │    │   AGENT STORES       │
│  - Function tools  │    │  - Directors         │
│  - RAG tools       │    │  - Coordinators      │
│  - Drawing tools   │    │  - Specialists       │
│  - Image gen tools │    │  - Image generators  │
└────────────────────┘    └──────┬───────────────┘
                                 │
                                 │ Used by
                                 │
                    ┌────────────▼──────────────┐
                    │  CONVERSATION STORES      │
                    │  - Metadata (lightweight) │
                    │  - Active conversation    │
                    │  - Streaming state        │
                    │  - Actions                │
                    └───────────────────────────┘
```

### Initialization Flow

```typescript
// main.jsx

import { $isConnected } from '@/stores/settingsStore';
import { initializeTools } from '@/stores/toolsStore';
import { initializeImageGenerationAgents } from '@/stores/imageGenerationAgentsStore';
import { initializeSpecializedAgents } from '@/stores/specializedAgentsStore';
import { initializeDirectorAgents } from '@/stores/directorAgentsStore';

// Watch for connection status
$isConnected.subscribe((connected) => {
  if (connected) {
    // Initialize in order (tools first, then agents)
    initializeTools();
    initializeImageGenerationAgents();
    initializeSpecializedAgents();
    initializeDirectorAgents();
  }
});
```

## Settings Store

**File**: `src/stores/settingsStore.ts`

### State Structure

```typescript
// Persistent atoms (saved to localStorage)
export const $openaiApiKey = persistentAtom<string>('openaiApiKey', '');
export const $openrouterApiKey = persistentAtom<string>('openrouterApiKey', '');
export const $selectedLanguageModel = persistentAtom<string>('selectedLanguageModel', '');
export const $selectedImageModel = persistentAtom<string>('selectedImageModel', '');

// Runtime atoms (not persisted)
export const $availableModels = atom<LanguageModel[]>([]);
export const $availableImageModels = atom<ImageModel[]>([]);
export const $isFetchingModels = atom<boolean>(false);
export const $modelError = atom<string>('');

// Computed atoms (derived state)
export const $isConnected = computed(
  [$openaiApiKey, $openrouterApiKey, $selectedLanguageModel],
  (openaiKey, openrouterKey, model) => {
    if (model.startsWith('gpt-')) {
      return openaiKey.length > 0 && model.length > 0;
    } else {
      return openrouterKey.length > 0 && model.length > 0;
    }
  }
);
```

### Actions

#### `fetchModels()`

Fetch available models from providers and update state.

```typescript
export async function fetchModels() {
  $isFetchingModels.set(true);
  $modelError.set('');

  try {
    const languageModels: LanguageModel[] = [];
    const imageModels: ImageModel[] = [];

    // Fetch OpenAI models if key exists
    if ($openaiApiKey.get()) {
      const openaiClient = new OpenAI({
        apiKey: $openaiApiKey.get(),
        dangerouslyAllowBrowser: true
      });

      const models = await openaiClient.models.list();

      // Filter for GPT models
      const gptModels = models.data.filter(m =>
        m.id.startsWith('gpt-') && m.id.includes('turbo')
      );

      languageModels.push(...gptModels.map(m => ({
        id: m.id,
        name: m.id,
        provider: 'openai'
      })));

      // Add DALL-E for images
      imageModels.push({
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai'
      });
    }

    // Fetch OpenRouter models if key exists
    if ($openrouterApiKey.get()) {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${$openrouterApiKey.get()}` }
      });

      const data = await response.json();

      // Filter for models with structured outputs
      const structuredModels = data.data.filter(m =>
        m.architecture?.supports_structured_outputs
      );

      languageModels.push(...structuredModels.map(m => ({
        id: m.id,
        name: m.name,
        provider: 'openrouter'
      })));

      // Add image models from OpenRouter
      const imageGens = data.data.filter(m =>
        m.id.includes('flux') || m.id.includes('stable-diffusion')
      );

      imageModels.push(...imageGens.map(m => ({
        id: m.id,
        name: m.name,
        provider: 'openrouter'
      })));
    }

    $availableModels.set(languageModels);
    $availableImageModels.set(imageModels);

    // Auto-select first model if none selected
    if (!$selectedLanguageModel.get() && languageModels.length > 0) {
      $selectedLanguageModel.set(languageModels[0].id);
    }

    if (!$selectedImageModel.get() && imageModels.length > 0) {
      $selectedImageModel.set(imageModels[0].id);
    }

  } catch (error) {
    $modelError.set(error.message);
  } finally {
    $isFetchingModels.set(false);
  }
}
```

### Usage in Components

```typescript
// SettingsForm.jsx

import { useStore } from '@nanostores/react';
import {
  $openaiApiKey,
  $selectedLanguageModel,
  $availableModels,
  $isConnected,
  fetchModels
} from '@/stores/settingsStore';

function SettingsForm() {
  const apiKey = useStore($openaiApiKey);
  const selectedModel = useStore($selectedLanguageModel);
  const availableModels = useStore($availableModels);
  const isConnected = useStore($isConnected);

  const handleKeyChange = (e) => {
    $openaiApiKey.set(e.target.value);
  };

  const handleModelChange = (e) => {
    $selectedLanguageModel.set(e.target.value);
  };

  const handleFetchModels = async () => {
    await fetchModels();
  };

  return (
    <form>
      <input value={apiKey} onChange={handleKeyChange} />
      <select value={selectedModel} onChange={handleModelChange}>
        {availableModels.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <button onClick={handleFetchModels}>Check API Keys</button>
      {isConnected && <span>✓ Connected</span>}
    </form>
  );
}
```

## Agent Stores

### Director Agents Store

**File**: `src/stores/directorAgentsStore.ts`

```typescript
import { atom } from 'nanostores';
import { experimental_createAgent as createAgent } from 'ai';
import { directorAgents } from '@/assets/directorAgents';
import { $userDirectorAgents } from '@/stores/userAgentsStore';
import { createModelInstance } from '@/utils/modelUtils';

// Combined agents (predefined + user-created)
export const $directorAgentsData = atom<DirectorAgent[]>([]);

// Initialize agents
export function initializeDirectorAgents() {
  const predefinedAgents = directorAgents.map(agent => ({
    ...agent,
    isUserCreated: false
  }));

  const userAgents = $userDirectorAgents.get().map(agent => ({
    ...agent,
    isUserCreated: true
  }));

  const combined = [...predefinedAgents, ...userAgents];

  // Create AI SDK agent instances
  const initialized = combined.map(agent => {
    const model = createModelInstance(
      $selectedLanguageModel.get(),
      $openaiApiKey.get()
    );

    const tools = {}; // Collect tools from toolsStore
    const agentTools = {}; // Collect specialized agents as tools

    const instance = createAgent({
      model,
      system: agent.system,
      tools: { ...tools, ...agentTools }
    });

    return { ...agent, instance };
  });

  $directorAgentsData.set(initialized);
}

// Get agent by ID
export function getDirectorAgentById(id: string): DirectorAgent | undefined {
  return $directorAgentsData.get().find(agent => agent.id === id);
}
```

### Specialized Agents Store

**File**: `src/stores/specializedAgentsStore.ts`

```typescript
export const $specializedAgentsData = atom<SpecializedAgentWithTool[]>([]);

export function initializeSpecializedAgents() {
  const predefined = specializedAgents.map(a => ({ ...a, isUserCreated: false }));
  const userAgents = $userSpecializedAgents.get().map(a => ({ ...a, isUserCreated: true }));
  const combined = [...predefined, ...userAgents];

  const initialized = combined.map(agent => {
    const model = createModelInstance(
      $selectedLanguageModel.get(),
      $openaiApiKey.get()
    );

    // Create agent instance
    const agentInstance = createAgent({
      model,
      system: agent.system,
      tools: collectToolsForAgent(agent)
    });

    // Wrap as tool
    const toolInstance = tool({
      description: agent.description,
      parameters: z.object({
        query: z.string().describe('Query for the specialized agent')
      }),
      execute: async ({ query }, { abortSignal }) => {
        const result = await agentInstance.stream({
          messages: [{ role: 'user', content: query }],
          abortSignal
        });

        // Handle streaming
        let finalResult = '';
        for await (const chunk of result) {
          // Process chunks
        }

        return finalResult;
      }
    });

    return { ...agent, instance: toolInstance, agentInstance };
  });

  $specializedAgentsData.set(initialized);
}
```

### Image Generation Agents Store

**File**: `src/stores/imageGenerationAgentsStore.ts`

```typescript
export const $imageGenerationAgentsData = atom<ImageGenerationAgentWithTool[]>([]);

export function initializeImageGenerationAgents() {
  const initialized = imageGenerationAgents.map(agent => {
    const toolInstance = tool({
      description: agent.description,
      parameters: z.object({
        prompt: z.string().describe('Image generation prompt'),
        size: z.enum(agent.sizes).optional()
      }),
      execute: async ({ prompt, size }) => {
        // Generate image using OpenAI/OpenRouter
        const imageUrl = await generateImage(prompt, agent.model, size);

        // Upload to Penpot
        const response = await sendMessageToPlugin(
          ClientQueryType.ADD_IMAGE,
          { imageUrl }
        );

        return { imageId: response.data.imageId };
      }
    });

    return { ...agent, instance: toolInstance };
  });

  $imageGenerationAgentsData.set(initialized);
}
```

## Conversation Stores

### V2 Architecture Overview

The V2 conversation architecture separates metadata from messages for better performance.

```
┌────────────────────────────────────────────┐
│     conversationsMetadataStore.ts          │
│  - All conversation metadata (lightweight) │
│  - Loaded at startup                       │
│  - Persisted to localStorage               │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│      activeConversationStore.ts            │
│  - Current conversation ID                 │
│  - Messages for ACTIVE conversation only   │
│  - Loaded on demand                        │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│      streamingMessageStore.ts              │
│  - Ephemeral streaming state               │
│  - Not persisted                           │
│  - Cleared after finalization              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│    conversationActionsStore.ts             │
│  - Actions (send, cancel, switch)          │
│  - Orchestrates other stores               │
│  - No state, only functions                │
└────────────────────────────────────────────┘
```

### Conversations Metadata Store

**File**: `src/stores/conversationsMetadataStore.ts`

```typescript
export interface ConversationMetadata {
  id: string;
  directorAgentId: string;
  summary: string | null;
  createdAt: Date;
  messageCount: number;
}

// Persistent atom (all metadata)
export const $conversationsMetadata = persistentAtom<ConversationMetadata[]>(
  'conversations_metadata_v2',
  [],
  {
    encode: JSON.stringify,
    decode: (str) => {
      const data = JSON.parse(str);
      // Deserialize dates
      return data.map(c => ({ ...c, createdAt: new Date(c.createdAt) }));
    }
  }
);

// Computed: sorted by creation date
export const $sortedConversationsMetadata = computed(
  [$conversationsMetadata],
  (metadata) => [...metadata].sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  )
);

// Actions
export function createConversationMetadata(
  directorAgentId: string
): ConversationMetadata {
  const newMetadata: ConversationMetadata = {
    id: generateUUID(),
    directorAgentId,
    summary: null,
    createdAt: new Date(),
    messageCount: 0
  };

  $conversationsMetadata.set([
    ...$conversationsMetadata.get(),
    newMetadata
  ]);

  return newMetadata;
}

export function updateConversationSummary(id: string, summary: string) {
  const metadata = $conversationsMetadata.get();
  const updated = metadata.map(c =>
    c.id === id ? { ...c, summary } : c
  );
  $conversationsMetadata.set(updated);
}

export function incrementMessageCount(id: string) {
  const metadata = $conversationsMetadata.get();
  const updated = metadata.map(c =>
    c.id === id ? { ...c, messageCount: c.messageCount + 1 } : c
  );
  $conversationsMetadata.set(updated);
}
```

### Active Conversation Store

**File**: `src/stores/activeConversationStore.ts`

```typescript
import { atom, computed } from 'nanostores';
import {
  loadConversationMessages,
  saveConversationMessages
} from '@/utils/messagesStorageUtils';

// Which conversation is active
export const $activeConversationId = atom<string | null>(null);

// Messages for active conversation (loaded from localStorage)
export const $activeConversationMessages = atom<Message[]>([]);

// Full conversation (metadata + messages)
export const $activeConversationFull = computed(
  [$activeConversationId, $activeConversationMessages, $conversationsMetadata],
  (id, messages, metadata) => {
    if (!id) return null;

    const meta = metadata.find(m => m.id === id);
    return meta ? { ...meta, messages } : null;
  }
);

// Actions
export function setActiveConversation(conversationId: string | null) {
  if (conversationId) {
    // Load messages from localStorage
    const messages = loadConversationMessages(conversationId);
    $activeConversationMessages.set(messages);
  } else {
    $activeConversationMessages.set([]);
  }

  $activeConversationId.set(conversationId);
}

export function addMessageToActive(message: Message) {
  const current = $activeConversationMessages.get();
  const updated = [...current, message];

  $activeConversationMessages.set(updated);

  // Persist to localStorage
  if ($activeConversationId.get()) {
    saveConversationMessages($activeConversationId.get()!, updated);
  }
}
```

### Streaming Message Store

**File**: `src/stores/streamingMessageStore.ts`

```typescript
export interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
  toolCalls?: AgentToolCall[];
  error?: string;
}

// Ephemeral state (not persisted)
export const $streamingMessage = atom<StreamingMessage | null>(null);
export const $isStreaming = atom<boolean>(false);
export const $currentAbortController = atom<AbortController | null>(null);

// Actions
export function initializeStreaming(messageId: string) {
  $streamingMessage.set({
    id: messageId,
    role: 'assistant',
    content: '',
    isStreaming: true,
    toolCalls: []
  });

  $isStreaming.set(true);

  const abortController = new AbortController();
  $currentAbortController.set(abortController);

  return abortController.signal;
}

export function updateStreamingContent(delta: string) {
  const current = $streamingMessage.get();
  if (!current) return;

  $streamingMessage.set({
    ...current,
    content: current.content + delta
  });
}

export function addToolCall(toolCall: AgentToolCall) {
  const current = $streamingMessage.get();
  if (!current) return;

  $streamingMessage.set({
    ...current,
    toolCalls: [...(current.toolCalls || []), toolCall]
  });
}

export function updateToolCall(
  toolCallId: string,
  update: Partial<AgentToolCall>
) {
  const current = $streamingMessage.get();
  if (!current || !current.toolCalls) return;

  const updated = current.toolCalls.map(tc =>
    tc.id === toolCallId ? { ...tc, ...update } : tc
  );

  $streamingMessage.set({
    ...current,
    toolCalls: updated
  });
}

export function finalizeStreaming() {
  const current = $streamingMessage.get();
  if (!current) return;

  $streamingMessage.set({
    ...current,
    isStreaming: false
  });

  $isStreaming.set(false);
  $currentAbortController.set(null);
}

export function clearStreamingMessage() {
  $streamingMessage.set(null);
}
```

### Conversation Actions Store

**File**: `src/stores/conversationActionsStore.ts`

Orchestrates all conversation operations.

```typescript
export async function sendUserMessage(text: string, hidden: boolean = false) {
  const activeId = $activeConversationId.get();
  if (!activeId) return;

  // 1. Add user message
  const userMessage: Message = {
    id: generateUUID(),
    role: 'user',
    content: text,
    timestamp: new Date(),
    hidden
  };

  addMessageToActive(userMessage);
  incrementMessageCount(activeId);

  // 2. Get director agent
  const metadata = $conversationsMetadata.get().find(c => c.id === activeId);
  const director = getDirectorAgentById(metadata!.directorAgentId);

  if (!director?.instance) {
    throw new Error('Director agent not initialized');
  }

  // 3. Initialize streaming
  const assistantId = generateUUID();
  const abortSignal = initializeStreaming(assistantId);

  // 4. Prepare messages
  const conversationHistory = $activeConversationMessages.get();

  try {
    // 5. Stream response
    const result = await director.instance.stream({
      messages: conversationHistory,
      abortSignal
    });

    // 6. Process stream
    for await (const chunk of result) {
      await handleStreamChunk(chunk);
    }

    // 7. Finalize
    finalizeStreaming();

    // 8. Save assistant message
    const streamingMsg = $streamingMessage.get();
    if (streamingMsg) {
      const assistantMessage: Message = {
        ...streamingMsg,
        timestamp: new Date()
      };

      addMessageToActive(assistantMessage);
      incrementMessageCount(activeId);
    }

    clearStreamingMessage();

    // 9. Generate summary if needed
    if (!metadata!.summary && conversationHistory.length >= 2) {
      await generateConversationSummary(activeId);
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      // Handle cancellation
      finalizeStreaming();
      addMessageToActive({
        id: assistantId,
        role: 'assistant',
        content: '_[Cancelled by user]_',
        timestamp: new Date()
      });
    } else {
      // Handle error
      setStreamingError(error.message);
    }

    clearStreamingMessage();
  }
}

export function abortCurrentStream() {
  const controller = $currentAbortController.get();
  if (controller) {
    controller.abort();
  }
}
```

## Tools Store

**File**: `src/stores/toolsStore.ts`

```typescript
export const $toolsData = atom<{
  functionTools: FunctionToolWithInstance[];
  ragTools: RagToolWithInstance[];
  drawingTools: FunctionToolWithInstance[];
}>({
  functionTools: [],
  ragTools: [],
  drawingTools: []
});

export async function initializeTools() {
  // 1. Initialize function tools
  const functionToolsInit = functionTools.map(t => ({
    ...t,
    instance: tool({
      description: t.description,
      parameters: t.inputSchema,
      execute: t.function
    })
  }));

  // 2. Initialize RAG tools
  const ragToolsInit = await Promise.all(
    ragTools.map(async (t) => {
      // Load database
      const db = await initializeDatabase(t.ragContentFile);

      const instance = tool({
        description: t.description,
        parameters: z.object({
          query: z.string().describe('Search query')
        }),
        execute: async ({ query }) => {
          const results = await searchDatabase(db, query);
          return formatResults(results);
        }
      });

      return { ...t, instance, database: db };
    })
  );

  // 3. Initialize drawing tools
  const drawingToolsInit = drawingTools.map(t => ({
    ...t,
    instance: tool({
      description: t.description,
      parameters: t.inputSchema,
      execute: t.function
    })
  }));

  $toolsData.set({
    functionTools: functionToolsInit,
    ragTools: ragToolsInit,
    drawingTools: drawingToolsInit
  });
}

export function getToolById(id: string) {
  const data = $toolsData.get();
  return [
    ...data.functionTools,
    ...data.ragTools,
    ...data.drawingTools
  ].find(t => t.id === id);
}
```

## Penpot Store

**File**: `src/stores/penpotStore.ts`

```typescript
export const $penpotTheme = atom<'light' | 'dark'>('light');
export const $isPenpotContext = atom<boolean>(false);

// Initialize from URL params
export function initializePenpotStore() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');

  if (theme === 'light' || theme === 'dark') {
    $penpotTheme.set(theme);
    $isPenpotContext.set(true);
  }
}

// Listen to theme changes
window.addEventListener('message', (event) => {
  if (event.data?.source === 'penpotWizardPlugin') {
    if (event.data.type === 'THEME_CHANGE') {
      $penpotTheme.set(event.data.payload.theme);
    }
  }
});
```

## Best Practices

### 1. Atom Naming

Always prefix atoms with `$`:
```typescript
✅ export const $activeConversationId = atom<string | null>(null);
❌ export const activeConversationId = atom<string | null>(null);
```

### 2. Computed Atoms

Use for derived state:
```typescript
export const $activeConversationFull = computed(
  [$activeConversationId, $activeConversationMessages, $conversationsMetadata],
  (id, messages, metadata) => {
    // Derive state
  }
);
```

### 3. Actions vs Atoms

- **Atoms**: State only
- **Actions**: Functions that modify state

```typescript
// ✅ Good
export const $count = atom(0);
export function increment() {
  $count.set($count.get() + 1);
}

// ❌ Bad - mixing state and logic in atom
export const $count = atom({
  value: 0,
  increment() { this.value++; }
});
```

### 4. Persistence

Use `persistentAtom` for user preferences:
```typescript
// ✅ Persist user settings
export const $openaiApiKey = persistentAtom('openaiApiKey', '');

// ❌ Don't persist ephemeral state
export const $streamingMessage = atom(null); // Not persistent
```

### 5. Store Organization

One store per domain:
```typescript
// ✅ Good - clear separation
settingsStore.ts     // Settings only
conversationsStore.ts // Conversations only

// ❌ Bad - mixed concerns
appStore.ts // Everything mixed together
```

### 6. React Integration

Use `useStore` hook:
```typescript
import { useStore } from '@nanostores/react';

function MyComponent() {
  const count = useStore($count);
  // Component re-renders when count changes
}
```

### 7. Direct Updates

Update atoms directly outside React:
```typescript
// In utility functions, no need for hooks
export function resetSettings() {
  $openaiApiKey.set('');
  $selectedLanguageModel.set('');
}
```

### 8. Memory Management

Clean up when needed:
```typescript
// Clear old conversations
export function cleanupOldConversations() {
  const metadata = $conversationsMetadata.get();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

  const active = metadata.filter(c => c.createdAt.getTime() > cutoff);
  $conversationsMetadata.set(active);

  // Clean up localStorage
  const removed = metadata.filter(c => c.createdAt.getTime() <= cutoff);
  removed.forEach(c => {
    localStorage.removeItem(`messages_v2_${c.id}`);
  });
}
```

---

**Next**: See [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) for multi-agent architecture details and [TOOLS_SYSTEM.md](./TOOLS_SYSTEM.md) for tools creation guide.
