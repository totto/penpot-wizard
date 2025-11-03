# Code Structure

## Table of Contents
- [Directory Overview](#directory-overview)
- [File Organization](#file-organization)
- [Module Responsibilities](#module-responsibilities)
- [Import Conventions](#import-conventions)
- [Naming Conventions](#naming-conventions)

## Directory Overview

```
penpot-wizard/
├── public/                          # Static assets
│   ├── manifest.json               # Penpot plugin manifest
│   ├── icon.svg                    # Plugin icon
│   └── penpotRagToolContents.zip   # RAG database (compressed)
│
├── src/
│   ├── assets/                     # Agent and tool definitions
│   │   ├── directorAgents.ts      # Director agent configurations
│   │   ├── coordinatorAgents.ts   # Coordinator agent configurations
│   │   ├── specializedAgents.ts   # Specialized agent configurations
│   │   ├── imageGenerationAgents.ts # Image generation agents
│   │   ├── functionTools.ts       # Function tool definitions
│   │   ├── ragTools.ts            # RAG tool definitions
│   │   ├── drawingTools.ts        # Drawing tool definitions
│   │   └── tools.ts               # Legacy tools (deprecated)
│   │
│   ├── components/                 # React components
│   │   ├── Chat/                  # Chat interface
│   │   │   ├── Chat.jsx           # Main chat container
│   │   │   ├── Header/            # Chat header
│   │   │   │   └── Header.jsx
│   │   │   ├── ChatMessages/      # Message display
│   │   │   │   ├── ChatMessages.jsx
│   │   │   │   ├── MessageHistory.jsx
│   │   │   │   ├── StreamingMessageView.jsx
│   │   │   │   └── ToolCallDetails/
│   │   │   │       └── ToolCallDetails.jsx
│   │   │   ├── Footer/            # Input area
│   │   │   │   └── Footer.jsx
│   │   │   └── StartPage/         # Empty state
│   │   │       └── StartPage.jsx
│   │   │
│   │   ├── LeftSidebar/           # Settings and configuration
│   │   │   ├── LeftSidebar.jsx
│   │   │   ├── SettingsForm/      # API keys and models
│   │   │   │   └── SettingsForm.jsx
│   │   │   ├── AgentsList/        # Agent management
│   │   │   │   ├── AgentsList.jsx
│   │   │   │   ├── AgentDetailsCard/
│   │   │   │   │   ├── AgentDetailsCard.jsx
│   │   │   │   │   └── AgentDetailsContent/
│   │   │   │   │       └── AgentDetailsContent.jsx
│   │   │   │   ├── EditAgentForm/
│   │   │   │   │   └── EditAgentForm.jsx
│   │   │   │   ├── EntryAgentSelector/
│   │   │   │   │   └── EntryAgentSelector.jsx
│   │   │   │   ├── SchemaEditor/
│   │   │   │   │   └── SchemaEditor.jsx
│   │   │   │   └── SchemaVisor/
│   │   │   │       └── SchemaVisor.jsx
│   │   │   ├── Tools/             # Tools display
│   │   │   │   └── Tools.jsx
│   │   │   └── Download/          # Export functionality
│   │   │       └── Download.jsx
│   │   │
│   │   └── StreamingCancelDialog/ # Cancellation dialog
│   │       └── StreamingCancelDialog.jsx
│   │
│   ├── plugin/                     # Penpot plugin code
│   │   ├── plugin.ts              # Main plugin entry point
│   │   ├── mainHandlers.ts        # Data query handlers
│   │   ├── drawHandlers.ts        # Shape creation handlers
│   │   └── utils.ts               # Plugin utilities
│   │
│   ├── stores/                     # State management (nanostores)
│   │   ├── settingsStore.ts       # API keys, models
│   │   ├── directorAgentsStore.ts # Director agent instances
│   │   ├── coordinatorAgentsStore.ts # Coordinator instances
│   │   ├── specializedAgentsStore.ts # Specialist instances
│   │   ├── imageGenerationAgentsStore.ts # Image gen instances
│   │   ├── userAgentsStore.ts     # Custom user agents
│   │   ├── toolsStore.ts          # Tool instances
│   │   ├── conversationsMetadataStore.ts # Conversation metadata
│   │   ├── activeConversationStore.ts # Active conversation
│   │   ├── streamingMessageStore.ts # Streaming state
│   │   ├── conversationActionsStore.ts # Conversation actions
│   │   └── penpotStore.ts         # Penpot theme/state
│   │
│   ├── types/                      # TypeScript types
│   │   ├── types.ts               # Core type definitions
│   │   ├── shapeTypes.ts          # Penpot shape types
│   │   └── ragToolTypes.ts        # RAG tool types
│   │
│   ├── utils/                      # Utility functions
│   │   ├── modelUtils.ts          # AI model creation
│   │   ├── ragUtils.ts            # RAG database operations
│   │   ├── pluginUtils.ts         # Plugin communication
│   │   ├── messagesUtils.ts       # Message parsing/formatting
│   │   ├── messagesStorageUtils.ts # LocalStorage persistence
│   │   ├── streamingMessageUtils.ts # Stream processing
│   │   ├── zodSchemaParser.ts     # Zod schema parsing
│   │   ├── zodToAST.ts            # Zod to AST conversion
│   │   └── schemaAST.ts           # Schema AST utilities
│   │
│   ├── App.jsx                     # Main app component
│   └── main.jsx                    # Application entry point
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── CODE_STRUCTURE.md          # File organization
│   ├── STATE_MANAGEMENT.md        # State architecture
│   ├── AGENT_SYSTEM.md            # Multi-agent details
│   ├── TOOLS_SYSTEM.md            # Tools creation guide
│   ├── PLUGIN_COMMUNICATION.md    # Plugin integration
│   ├── CONTRIBUTING.md            # Contribution guide
│   ├── DEVELOPMENT.md             # Development setup
│   ├── PATH_COMMANDS_GUIDE.md     # Drawing path commands
│   └── pathCommandsExamples.ts    # Path examples
│
├── dist/                           # Build output (gitignored)
├── node_modules/                   # Dependencies (gitignored)
├── package.json                    # Project metadata
├── vite.config.js                  # Vite UI config
├── vite.config.plugin.ts           # Vite plugin config
├── vitest.config.ts                # Test configuration
└── eslint.config.js                # ESLint configuration
```

## File Organization

### Assets (`src/assets/`)

Configuration files that define agents and tools. These are **data** files, not runtime code.

#### `directorAgents.ts`
```typescript
export const directorAgents: DirectorAgent[] = [
  {
    id: 'penpot-wizard',
    name: 'PenpotWizard',
    description: '...',
    system: '...', // System prompt
    toolIds: ['penpot-user-guide-rag', 'get-user-data'],
    specializedAgentIds: ['mobile-projects-coordinator']
  }
];
```

**Responsibilities**:
- Define director agent configurations
- System prompts for personality and behavior
- Specify which tools/agents each director can use

#### `coordinatorAgents.ts`
```typescript
export const coordinatorAgents: SpecializedAgent[] = [
  {
    id: 'mobile-projects-coordinator',
    name: 'mobileProjectsCoordinator',
    description: 'Use when user has validated brief...',
    system: '...',
    outputSchema: z.object({...}),
    toolIds: [],
    specializedAgentIds: ['project-plan-specialist', 'ui-design-specialist']
  }
];
```

**Responsibilities**:
- Define coordinator configurations (implemented as SpecializedAgents)
- Orchestration logic in system prompts
- Output schemas for structured results
- List of specialists to coordinate

#### `specializedAgents.ts`
```typescript
export const specializedAgents: SpecializedAgent[] = [
  {
    id: 'ui-design-specialist',
    name: 'uiDesignSpecialist',
    description: '...',
    system: '...',
    outputSchema: z.object({...}),
    toolIds: ['get-project-data'],
    specializedAgentIds: []
  }
];
```

**Responsibilities**:
- Define specialist configurations
- Domain-specific system prompts
- Input/output schemas
- Tools and sub-agents they can use

#### `imageGenerationAgents.ts`
```typescript
export const imageGenerationAgents: ImageGenerationAgent[] = [
  {
    id: 'image-generator',
    name: 'imageGenerator',
    model: 'dall-e-3',
    description: '...',
    sizes: ['1024x1024', '1792x1024', '1024x1792']
  }
];
```

**Responsibilities**:
- Define image generation agents
- Model and provider configuration
- Supported image sizes

#### `functionTools.ts`
```typescript
export const functionTools: FunctionTool[] = [
  {
    id: 'get-user-data',
    name: 'getUserData',
    description: '...',
    inputSchema: z.object({...}),
    function: async (params) => {
      // Tool implementation
      return await sendMessageToPlugin(ClientQueryType.GET_USER_DATA);
    }
  }
];
```

**Responsibilities**:
- Define function tools
- Input validation schemas
- Tool implementation (JavaScript functions)

#### `ragTools.ts`
```typescript
export const ragTools: RagTool[] = [
  {
    id: 'penpot-user-guide-rag',
    name: 'penpotUserGuideRag',
    ragContentFile: 'penpotRagToolContents.zip',
    description: '...'
  }
];
```

**Responsibilities**:
- Define RAG tools
- Database file references
- Query instructions

#### `drawingTools.ts`
```typescript
export const drawingTools: FunctionTool[] = [
  {
    id: 'rectangle-maker',
    name: 'rectangleMaker',
    description: '...',
    inputSchema: penpotShapeProperties.extend({...}),
    function: async (shapeProperties) => {
      return await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
        shapeType: PenpotShapeType.RECTANGLE,
        params: shapeProperties
      });
    }
  }
];
```

**Responsibilities**:
- Define drawing tools for Penpot shapes
- Shape property schemas
- Plugin communication for drawing

### Components (`src/components/`)

React components organized by feature.

#### Component Hierarchy

```
App (src/App.jsx)
│
├─ LeftSidebar (components/LeftSidebar/)
│  │
│  ├─ SettingsForm
│  │  └─ API key inputs, model selection, validation
│  │
│  ├─ AgentsList
│  │  ├─ EntryAgentSelector (choose active director)
│  │  ├─ AgentDetailsCard (display agent info)
│  │  │  └─ AgentDetailsContent
│  │  ├─ EditAgentForm (create/edit custom agents)
│  │  ├─ SchemaEditor (edit input/output schemas)
│  │  └─ SchemaVisor (view schemas)
│  │
│  ├─ Tools
│  │  └─ Display available tools
│  │
│  └─ Download
│     └─ Export conversations/data
│
└─ Chat (components/Chat/)
   │
   ├─ Header
   │  └─ Conversation title, new chat button
   │
   ├─ ChatMessages
   │  ├─ MessageHistory (static messages, memoized)
   │  └─ StreamingMessageView (live streaming)
   │     └─ ToolCallDetails (show tool execution)
   │
   └─ Footer
      └─ Input textarea, send/stop button
```

#### Component Responsibilities

**`App.jsx`**
- Root component
- Theme management (sync with Penpot)
- Layout structure
- Agent initialization trigger

**`LeftSidebar/`**
- Configuration UI
- Settings management
- Agent management
- Tools display

**`Chat/`**
- Message display
- User input handling
- Streaming visualization
- Conversation management

### Plugin (`src/plugin/`)

Code that runs in Penpot's JavaScript context.

#### `plugin.ts`
```typescript
penpot.ui.open('Penpot Wizard', `${BASE_URL}?theme=${penpot.theme}`, {
  width: 280,
  height: 600
});

penpot.ui.onMessage<ClientMessage>(async (message: ClientMessage) => {
  const { type, messageId, payload } = message;

  let responsePayload: PluginResponsePayload = {
    success: false,
    description: '',
    data: null
  };

  switch (type) {
    case ClientQueryType.GET_USER_DATA:
      responsePayload = handleGetUserData();
      break;
    case ClientQueryType.DRAW_SHAPE:
      responsePayload = handleDrawShape(payload);
      break;
    // ... more handlers
  }

  sendResponseToClient(messageId, type, responsePayload);
});
```

**Responsibilities**:
- Open plugin UI (iframe)
- Listen for messages from UI
- Route to appropriate handler
- Send responses back to UI
- Handle theme changes

#### `mainHandlers.ts`
```typescript
export function handleGetUserData(): PluginResponsePayload {
  const user = penpot.currentUser;
  return {
    success: true,
    description: 'User data retrieved',
    data: { name: user?.name, id: user?.id }
  };
}

export function handleGetProjectData(): PluginResponsePayload {
  const file = penpot.currentFile;
  // ... extract project data
  return { success: true, data: projectData };
}
```

**Responsibilities**:
- Query Penpot for data (user, project, fonts, pages)
- Format data for UI consumption
- Error handling

#### `drawHandlers.ts`
```typescript
export function handleDrawShape(payload: DrawShapeQueryPayload): PluginResponsePayload {
  const { shapeType, params } = payload;

  let newShape: Shape | null = null;

  switch (shapeType) {
    case PenpotShapeType.RECTANGLE:
      newShape = penpot.createRectangle();
      break;
    case PenpotShapeType.ELLIPSE:
      newShape = penpot.createEllipse();
      break;
    // ... more shape types
  }

  if (newShape) {
    setParamsToShape(newShape, params);
  }

  return { success: true, data: { shape: newShape } };
}
```

**Responsibilities**:
- Create Penpot shapes (rectangles, ellipses, paths, text, boards)
- Apply properties to shapes
- Handle image uploads
- Error handling

#### `utils.ts`
```typescript
export function pathCommandsToSvgString(commands: PathCommand[]): string {
  return commands.map(cmd => {
    const { command, params } = cmd;
    // Convert to SVG path string format
    return `${command} ${formatParams(params)}`;
  }).join(' ');
}
```

**Responsibilities**:
- Convert path commands to SVG string
- Helper functions for shape manipulation

### Stores (`src/stores/`)

State management using nanostores.

#### Store Categories

**1. Settings Stores**
- `settingsStore.ts` - API keys, model selection, validation

**2. Agent Stores**
- `directorAgentsStore.ts` - Director agent instances
- `coordinatorAgentsStore.ts` - Coordinator instances (future separation)
- `specializedAgentsStore.ts` - Specialist instances
- `imageGenerationAgentsStore.ts` - Image gen instances
- `userAgentsStore.ts` - User-created custom agents

**3. Tools Store**
- `toolsStore.ts` - Function, RAG, drawing tool instances

**4. Conversation Stores**
- `conversationsMetadataStore.ts` - Lightweight conversation metadata
- `activeConversationStore.ts` - Active conversation messages
- `streamingMessageStore.ts` - Ephemeral streaming state
- `conversationActionsStore.ts` - Actions (send, cancel, etc.)

**5. Penpot Store**
- `penpotStore.ts` - Theme and plugin state

#### Store Structure Example

```typescript
// settingsStore.ts

import { persistentAtom, atom } from 'nanostores';

// Persistent atoms (saved to localStorage)
export const $openaiApiKey = persistentAtom<string>('openaiApiKey', '');
export const $selectedLanguageModel = persistentAtom<string>('selectedLanguageModel', '');

// Regular atoms (not persisted)
export const $availableModels = atom<LanguageModel[]>([]);

// Computed atoms (derived state)
export const $isConnected = computed(
  [$openaiApiKey, $selectedLanguageModel],
  (apiKey, model) => apiKey.length > 0 && model.length > 0
);

// Actions
export async function fetchModels() {
  // Implementation
}
```

### Types (`src/types/`)

TypeScript type definitions.

#### `types.ts`
```typescript
// Agent types
export interface DirectorAgent {
  id: string;
  name: string;
  description: string;
  system: string;
  toolIds?: string[];
  specializedAgentIds?: string[];
  instance?: Agent<any, any, any>;
}

// Message types
export enum ClientQueryType {
  GET_USER_DATA = 'GET_USER_DATA',
  DRAW_SHAPE = 'DRAW_SHAPE',
  // ...
}

// Tool types
export interface FunctionTool {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  function: (params: any) => Promise<any>;
}
```

**Responsibilities**:
- Core type definitions
- Enum declarations
- Interface definitions

#### `shapeTypes.ts`
```typescript
export enum PenpotShapeType {
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  PATH = 'path',
  TEXT = 'text',
  BOARD = 'board'
}

export enum PenpotBlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  // ...
}
```

**Responsibilities**:
- Penpot-specific enums
- Shape property types

#### `ragToolTypes.ts`
```typescript
export interface RagTool {
  id: string;
  name: string;
  ragContentFile: string;
  description: string;
  instance?: CoreTool;
}
```

**Responsibilities**:
- RAG tool types

### Utils (`src/utils/`)

Utility functions organized by domain.

#### `modelUtils.ts`
```typescript
export function createModelInstance(modelId: string, apiKey: string): LanguageModel {
  if (modelId.startsWith('gpt-')) {
    return openai(modelId, { apiKey });
  } else {
    return openrouter(modelId, { apiKey });
  }
}
```

**Responsibilities**:
- Create AI model instances
- Handle OpenAI vs OpenRouter
- Model configuration

#### `ragUtils.ts`
```typescript
export async function initializeDatabase(zipFile: string): Promise<Orama> {
  // Decompress zip file
  // Load Orama database
  // Return database instance
}

export async function searchDatabase(
  db: Orama,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Generate embedding
  // Perform vector search
  // Return results
}
```

**Responsibilities**:
- RAG database initialization
- Vector search operations
- Embedding generation

#### `pluginUtils.ts`
```typescript
export async function sendMessageToPlugin(
  queryType: ClientQueryType,
  payload?: any,
  timeoutMs: number = 30000
): Promise<PluginResponsePayload> {
  const messageId = generateUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);

    pendingMessages.set(messageId, { resolve, reject, timeout });

    window.parent.postMessage({
      source: 'penpotWizardClient',
      type: queryType,
      messageId,
      payload
    }, '*');
  });
}
```

**Responsibilities**:
- Plugin communication
- Promise-based message handling
- Timeout management

#### `messagesStorageUtils.ts`
```typescript
export function saveConversationMessages(
  conversationId: string,
  messages: Message[]
): void {
  localStorage.setItem(
    `messages_v2_${conversationId}`,
    JSON.stringify(messages)
  );
}

export function loadConversationMessages(
  conversationId: string
): Message[] {
  const data = localStorage.getItem(`messages_v2_${conversationId}`);
  return data ? JSON.parse(data) : [];
}
```

**Responsibilities**:
- LocalStorage operations
- Message serialization/deserialization
- Cleanup functions

#### `streamingMessageUtils.ts`
```typescript
export async function handleStreamChunk(
  chunk: any,
  updateFn: (update: Partial<StreamingMessage>) => void
): Promise<void> {
  switch (chunk.type) {
    case 'text-delta':
      updateFn({ content: chunk.textDelta });
      break;
    case 'tool-call':
      updateFn({ toolCalls: [...existing, chunk.toolCall] });
      break;
    // ... more handlers
  }
}
```

**Responsibilities**:
- Process stream chunks
- Update streaming state
- Handle tool calls

#### `zodSchemaParser.ts`, `zodToAST.ts`, `schemaAST.ts`
```typescript
// Convert Zod schemas to AST for display in UI
export function zodToAST(schema: z.ZodType): SchemaAST {
  // Parse Zod schema
  // Convert to AST representation
  // Return AST
}
```

**Responsibilities**:
- Zod schema parsing
- AST generation for UI display
- Schema validation helpers

## Module Responsibilities

### Clear Separation

```
┌─────────────────────────────────────────────┐
│             CONFIGURATION                   │
│  src/assets/                                │
│  - Agent definitions (data)                 │
│  - Tool definitions (data)                  │
│  - No runtime logic                         │
└─────────────────────────────────────────────┘
                    │
                    │ Read by
                    ▼
┌─────────────────────────────────────────────┐
│          INITIALIZATION                     │
│  src/stores/                                │
│  - Initialize agents from definitions       │
│  - Initialize tools from definitions        │
│  - Create AI SDK instances                  │
│  - Manage state                             │
└─────────────────────────────────────────────┘
                    │
                    │ Used by
                    ▼
┌─────────────────────────────────────────────┐
│           ORCHESTRATION                     │
│  src/stores/conversationActionsStore.ts     │
│  - Send messages to agents                  │
│  - Process streaming responses              │
│  - Execute tool calls                       │
└─────────────────────────────────────────────┘
                    │
                    │ Updates
                    ▼
┌─────────────────────────────────────────────┐
│              UI LAYER                       │
│  src/components/                            │
│  - Display chat interface                   │
│  - Show streaming responses                 │
│  - Handle user input                        │
└─────────────────────────────────────────────┘
```

### Plugin Layer

```
┌─────────────────────────────────────────────┐
│           PLUGIN ENTRY                      │
│  src/plugin/plugin.ts                       │
│  - Listen to postMessage                    │
│  - Route to handlers                        │
│  - Send responses                           │
└─────────────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  DATA HANDLERS   │  │  DRAW HANDLERS   │
│  mainHandlers.ts │  │  drawHandlers.ts │
│  - Get user      │  │  - Create shapes │
│  - Get project   │  │  - Apply props   │
│  - Get fonts     │  │  - Upload images │
└──────────────────┘  └──────────────────┘
```

## Import Conventions

### Absolute Imports

Use `@/` alias for `src/`:

```typescript
// ✅ Good
import { $isConnected } from '@/stores/settingsStore';
import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { DirectorAgent } from '@/types/types';

// ❌ Bad
import { $isConnected } from '../../../stores/settingsStore';
```

### Store Imports

```typescript
// Import atoms with $ prefix
import { $activeConversationId, $activeConversationMessages } from '@/stores/activeConversationStore';

// Import actions without prefix
import { sendUserMessage, cancelStreaming } from '@/stores/conversationActionsStore';
```

### Type Imports

```typescript
// Use type imports for types
import type { DirectorAgent, Message } from '@/types/types';

// Or inline type
import { type DirectorAgent, directorAgents } from '@/assets/directorAgents';
```

### Component Imports

```typescript
// Components use default export
import Chat from '@/components/Chat/Chat';
import Header from '@/components/Chat/Header/Header';
```

## Naming Conventions

### Files

- **Components**: PascalCase - `ChatMessages.jsx`, `AgentsList.jsx`
- **Stores**: camelCase with "Store" suffix - `settingsStore.ts`, `conversationActionsStore.ts`
- **Utils**: camelCase with "Utils" suffix - `pluginUtils.ts`, `ragUtils.ts`
- **Types**: camelCase with "Types" suffix - `shapeTypes.ts`, `ragToolTypes.ts`
- **Assets**: camelCase with plural - `directorAgents.ts`, `functionTools.ts`

### Variables

- **Atoms**: Start with `$` - `$isConnected`, `$activeConversationId`
- **Functions**: camelCase - `sendUserMessage`, `initializeTools`
- **Constants**: UPPER_SNAKE_CASE - `CLIENT_QUERY_TYPE`, `MAX_TIMEOUT`
- **Types/Interfaces**: PascalCase - `DirectorAgent`, `Message`, `PluginResponsePayload`
- **Enums**: PascalCase for name, UPPER_SNAKE_CASE for values
  ```typescript
  enum ClientQueryType {
    GET_USER_DATA = 'GET_USER_DATA',
    DRAW_SHAPE = 'DRAW_SHAPE'
  }
  ```

### Functions

- **Handlers**: Prefix with `handle` - `handleDrawShape`, `handleGetUserData`
- **Actions**: Verb first - `sendUserMessage`, `cancelStreaming`, `fetchModels`
- **Utilities**: Descriptive verb - `createModelInstance`, `generateUUID`
- **Getters**: Prefix with `get` - `getUserData`, `getProjectData`
- **Setters**: Prefix with `set` - `setActiveConversation`, `setStreamingMessage`

### Components

- **Containers**: Noun - `Chat`, `LeftSidebar`
- **Views**: Noun + "View" - `StreamingMessageView`, `MessageHistory`
- **Forms**: Noun + "Form" - `SettingsForm`, `EditAgentForm`
- **Cards**: Noun + "Card" - `AgentDetailsCard`
- **Dialogs**: Noun + "Dialog" - `StreamingCancelDialog`

## Code Organization Principles

### 1. Single Responsibility

Each file should have one clear purpose:
- ✅ `settingsStore.ts` - Only settings state
- ✅ `ragUtils.ts` - Only RAG operations
- ❌ Don't mix agent initialization with conversation logic

### 2. Dependency Direction

```
UI Components
    ↓ (depends on)
Stores (State + Actions)
    ↓ (depends on)
Utils (Pure functions)
    ↓ (depends on)
Types (Data structures)
```

Never reverse the dependency direction:
- ❌ Utils should not import from stores
- ❌ Types should not import from utils

### 3. Configuration vs Logic

**Configuration** (src/assets/):
- Pure data
- No functions
- Can have Zod schemas
- Imported by stores

**Logic** (src/stores/, src/utils/):
- Runtime functions
- State management
- Tool execution
- Imports from configuration

### 4. Plugin Isolation

Plugin code (`src/plugin/`) should:
- Not import from React components
- Not import from stores
- Only share types from `src/types/`
- Communicate only via postMessage

### 5. Test Organization

Tests live next to the code they test:
```
src/utils/
├── messagesUtils.ts
└── messagesUtils.test.ts
```

## Build Outputs

### Plugin Build
```
dist/
└── plugin.js              # IIFE bundle for Penpot context
```

### UI Build
```
dist/
├── index.html            # Main HTML
├── assets/
│   ├── index-[hash].js   # Main JS bundle
│   ├── index-[hash].css  # Main CSS bundle
│   └── ...               # Other chunks
├── icon.svg              # Plugin icon
├── manifest.json         # Plugin manifest
└── penpotRagToolContents.zip # RAG database
```

---

**Next**: See [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) for detailed state architecture and [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) for multi-agent system details.
