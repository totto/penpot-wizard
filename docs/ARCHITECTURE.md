# Penpot Wizard Architecture

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Three-Layer Architecture](#three-layer-architecture)
- [Multi-Agent System](#multi-agent-system)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)

## Overview

Penpot Wizard is an AI-powered design assistant plugin for Penpot that uses a sophisticated multi-agent architecture. The system is built on three core principles:

1. **Separation of Concerns**: Clear boundaries between plugin integration, UI, and AI orchestration
2. **Agent Hierarchy**: Three-tier agent system (Director → Coordinator → Specialist)
3. **Memory Efficiency**: Lazy loading and ephemeral streaming state

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PENPOT APPLICATION                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              PLUGIN LAYER (plugin.ts)                   │   │
│  │  - Runs in Penpot's JavaScript context                 │   │
│  │  - Direct access to Penpot API                         │   │
│  │  - Handles shape creation and data queries             │   │
│  │  - Synchronous operations                              │   │
│  └─────────────────┬──────────────────────────────────────┘   │
│                    │                                            │
│              postMessage API                                    │
│         (bidirectional communication)                           │
│                    │                                            │
│  ┌─────────────────▼──────────────────────────────────────┐   │
│  │              UI LAYER (React in iframe)                 │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │         STATE MANAGEMENT (nanostores)          │   │   │
│  │  │  - Settings Store                              │   │   │
│  │  │  - Agent Stores                                │   │   │
│  │  │  - Conversation Stores                         │   │   │
│  │  │  - Tools Store                                 │   │   │
│  │  └────────────────┬───────────────────────────────┘   │   │
│  │                   │                                     │   │
│  │  ┌────────────────▼───────────────────────────────┐   │   │
│  │  │         AI ORCHESTRATION LAYER                  │   │   │
│  │  │                                                  │   │   │
│  │  │  ┌──────────────────────────────────────────┐ │   │   │
│  │  │  │      Director Agent                      │ │   │   │
│  │  │  │  - User-facing orchestrator              │ │   │   │
│  │  │  │  - Delegates to coordinators             │ │   │   │
│  │  │  └──────────┬───────────────────────────────┘ │   │   │
│  │  │             │                                   │   │   │
│  │  │  ┌──────────▼───────────────────────────────┐ │   │   │
│  │  │  │      Coordinator Agents                  │ │   │   │
│  │  │  │  - Orchestrate project workflows         │ │   │   │
│  │  │  │  - Sequence specialist calls             │ │   │   │
│  │  │  └──────────┬───────────────────────────────┘ │   │   │
│  │  │             │                                   │   │   │
│  │  │  ┌──────────▼───────────────────────────────┐ │   │   │
│  │  │  │      Specialized Agents                  │ │   │   │
│  │  │  │  - Domain experts                        │ │   │   │
│  │  │  │  - Execute specific tasks                │ │   │   │
│  │  │  └──────────┬───────────────────────────────┘ │   │   │
│  │  │             │                                   │   │   │
│  │  │  ┌──────────▼───────────────────────────────┐ │   │   │
│  │  │  │           Tools                          │ │   │   │
│  │  │  │  - Function Tools                        │ │   │   │
│  │  │  │  - RAG Tools                             │ │   │   │
│  │  │  │  - Drawing Tools                         │ │   │   │
│  │  │  └──────────────────────────────────────────┘ │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Three-Layer Architecture

### Layer 1: Plugin Layer

**Location**: `src/plugin/`

**Purpose**: Bridge between Penpot API and the UI layer

**Components**:
- `plugin.ts` - Main entry point, message router
- `mainHandlers.ts` - Data query handlers (user, project, fonts, pages)
- `drawHandlers.ts` - Shape creation handlers
- `utils.ts` - Path command utilities

**Responsibilities**:
- Listen to postMessage from UI
- Execute Penpot API operations
- Return results via postMessage
- Manage shape creation and manipulation

**Key Characteristics**:
- Runs in Penpot's JavaScript context
- Synchronous operations (no async/await in plugin context)
- Direct access to `penpot` global object
- No React, no complex state management

### Layer 2: UI Layer

**Location**: `src/components/`, `src/App.jsx`, `src/main.jsx`

**Purpose**: User interface and interaction

**Main Components**:

```
App.jsx
├── LeftSidebar/
│   ├── SettingsForm/           # API keys, model selection
│   ├── AgentsList/             # Agent management
│   ├── Tools/                  # Tools display
│   └── Download/               # Export functionality
└── Chat/
    ├── Header/                 # Conversation header
    ├── ChatMessages/           # Message display
    │   ├── MessageHistory      # Static history (memoized)
    │   └── StreamingMessageView # Live streaming
    └── Footer/                 # Input and send button
```

**Responsibilities**:
- Render chat interface
- Handle user input
- Display streaming responses
- Manage conversation history
- Configure settings

### Layer 3: AI Orchestration Layer

**Location**: `src/stores/`, `src/assets/`, `src/utils/`

**Purpose**: Multi-agent AI system orchestration

**Components**:

#### State Management (`src/stores/`)
- **Agent Stores**: Initialize and manage AI agent instances
- **Conversation Stores**: Manage chat state and persistence
- **Settings Store**: API keys and model configuration
- **Tools Store**: Initialize and manage tools

#### Agent Definitions (`src/assets/`)
- **Director Agents**: High-level orchestrators
- **Coordinator Agents**: Project workflow managers
- **Specialized Agents**: Domain experts
- **Tools**: Function, RAG, and drawing tools

#### Utilities (`src/utils/`)
- **Model Utils**: Create AI model instances
- **RAG Utils**: Vector database operations
- **Plugin Utils**: Communication helpers
- **Streaming Utils**: Stream processing
- **Message Storage Utils**: Persistence layer

## Multi-Agent System

### Agent Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    USER                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Chat Interface
                     │
         ┌───────────▼────────────┐
         │   DIRECTOR AGENT       │
         │   "PenpotWizard"       │
         │                        │
         │ Responsibilities:      │
         │ - Identify project type│
         │ - Elicit requirements  │
         │ - Answer questions     │
         │ - Delegate to coords   │
         └───────────┬────────────┘
                     │
          ┌──────────┴───────────┐
          │                      │
┌─────────▼────────┐   ┌────────▼──────────┐
│  RAG TOOLS       │   │  COORDINATOR      │
│  - Search docs   │   │  AGENTS           │
└──────────────────┘   │                   │
                       │ - Mobile Projects │
                       │ - Web Projects    │
                       │ (future)          │
                       └────────┬──────────┘
                                │
                     ┌──────────┴───────────┐
                     │                      │
          ┌──────────▼────────┐  ┌─────────▼─────────┐
          │ SPECIALIZED AGENTS│  │   FUNCTION TOOLS  │
          │                   │  │                   │
          │ - UI Design       │  │ - Get user data   │
          │ - UX Design       │  │ - Get project     │
          │ - Project Plan    │  │ - Get fonts       │
          │ - View Designer   │  └───────────────────┘
          └──────────┬────────┘
                     │
          ┌──────────┴───────────┐
          │                      │
┌─────────▼──────────┐ ┌────────▼──────────┐
│  DRAWING TOOLS     │ │  IMAGE GENERATION │
│  - Rectangles      │ │  AGENTS           │
│  - Ellipses        │ │  - DALL-E         │
│  - Paths           │ │  - Flux           │
│  - Text            │ │  - Stable Diff    │
│  - Boards          │ └───────────────────┘
└────────────────────┘
```

### Agent Types Explained

#### 1. Director Agents

**File**: `src/assets/directorAgents.ts`

**Purpose**: Single entry point for user interaction

**Characteristics**:
- User-facing conversational interface
- Orchestrates high-level workflows
- Delegates to coordinators and specialists
- Has access to RAG tools and basic data tools
- Never performs specialist work directly

**Example**: PenpotWizard
- Identifies if user wants to create a project or ask a question
- Elicits project requirements through conversation
- Delegates to MobileProjectsCoordinator for execution
- Uses RAG to answer Penpot documentation questions

#### 2. Coordinator Agents

**File**: `src/assets/coordinatorAgents.ts`

**Implementation**: Wrapped as SpecializedAgents (tools)

**Purpose**: Orchestrate multi-step project workflows

**Characteristics**:
- Not user-facing (called by directors)
- Validate project briefs
- Sequence calls to multiple specialists
- Maintain project state
- Report progress back to director
- Can use structured output schemas

**Example**: MobileProjectsCoordinator
- Receives project brief from director
- Calls ProjectPlanSpecialist → get phased plan
- Calls UIDesignSpecialist → get design system
- Calls UXDesignSpecialist → get screens/flows
- For each screen, calls MobileViewDesigner → draw it
- Reports completion with summary

#### 3. Specialized Agents

**File**: `src/assets/specializedAgents.ts`

**Purpose**: Domain-specific expertise

**Characteristics**:
- Focused on single domain (UI, UX, drawing)
- Wrapped as tools (callable by coordinators)
- Can have input/output schemas
- Can call other specialists (composition)
- Can use function tools and drawing tools

**Examples**:
- **UIDesignSpecialist**: Defines color palettes, typography, spacing
- **UXDesignSpecialist**: Defines screens, navigation flows, states
- **ProjectPlanSpecialist**: Creates phased delivery plans
- **MobileViewDesigner**: Executes drawing operations in Penpot

#### 4. Image Generation Agents

**File**: `src/assets/imageGenerationAgents.ts`

**Purpose**: Generate images from text prompts

**Characteristics**:
- Wrapped as tools
- Return `imageId` for use in shapes
- Automatically upload to Penpot
- Support multiple providers (DALL-E, Flux, Stable Diffusion)

## Data Flow

### Message Flow: User Input → AI Response

```
1. USER TYPES MESSAGE
   └─> Footer.jsx handleSendMessage()

2. ADD TO CONVERSATION
   └─> conversationActionsStore.sendUserMessage()
       ├─> Add user message to activeConversationStore
       └─> Prepare conversation history

3. STREAM AI RESPONSE
   └─> directorAgent.instance.stream({messages})
       ├─> OpenAI/OpenRouter API call
       └─> Stream chunks received

4. PROCESS STREAM CHUNKS
   └─> streamingMessageUtils.handleStreamChunk()
       ├─> 'text-delta': Update content
       ├─> 'tool-call': Track tool execution
       ├─> 'tool-result': Update result
       └─> 'error': Handle errors

5. UPDATE UI
   └─> streamingMessageStore updates
       └─> StreamingMessageView re-renders

6. FINALIZE
   └─> conversationActionsStore.finalizeStreaming()
       ├─> Save to activeConversationStore
       ├─> Persist to localStorage
       ├─> Update conversation metadata
       └─> Generate summary
```

### Tool Execution Flow

```
1. AGENT DECIDES TO USE TOOL
   └─> AI SDK determines tool call needed

2. TOOL EXECUTION
   └─> Tool function called with parameters
       │
       ├─> FUNCTION TOOL
       │   └─> Execute JavaScript function
       │       └─> May send postMessage to plugin
       │
       ├─> RAG TOOL
       │   └─> Vector search in Orama database
       │       └─> Return relevant documentation
       │
       ├─> DRAWING TOOL
       │   └─> sendMessageToPlugin(DRAW_SHAPE)
       │       └─> Plugin creates shape
       │           └─> Returns shape object
       │
       └─> SPECIALIZED AGENT (wrapped as tool)
           └─> agentInstance.stream({query})
               └─> Nested streaming with parent tracking

3. RETURN RESULT
   └─> Tool returns result object
       └─> AI processes result
           └─> Continues generating response
```

### Plugin Communication Flow

```
UI (React)                        Plugin (Penpot)
    │                                   │
    │  1. Create message with UUID      │
    │     {                              │
    │       source: 'client',           │
    │       type: 'DRAW_SHAPE',         │
    │       messageId: 'uuid-123',      │
    │       payload: {...}              │
    │     }                              │
    │─────────────────────────────────>│
    │                                   │
    │                        2. Route to handler
    │                           (mainHandlers or drawHandlers)
    │                                   │
    │                        3. Execute Penpot API
    │                           penpot.createRectangle()
    │                                   │
    │  4. Return response with same UUID│
    │     {                              │
    │       source: 'plugin',           │
    │       type: 'DRAW_SHAPE',         │
    │       messageId: 'uuid-123',      │
    │       success: true,              │
    │       payload: {shape}            │
    │     }                              │
    │<─────────────────────────────────│
    │                                   │
    │  5. Resolve promise               │
    │     with result                   │
    │                                   │
```

## Key Design Decisions

### 1. Three-Tier Agent Hierarchy

**Why?**
- **Separation of concerns**: Directors handle UX, coordinators handle orchestration, specialists handle execution
- **Reusability**: Specialists can be used by multiple coordinators
- **Scalability**: Easy to add new specialists without changing directors

### 2. Nanostores for State Management

**Why?**
- **Lightweight**: ~300 bytes minified
- **Simple API**: No boilerplate, easy to understand
- **Framework agnostic**: Works with any UI library
- **Computed atoms**: Derived state with automatic updates
- **Persistence**: Built-in localStorage integration

### 3. Streaming Architecture

**Why?**
- **Real-time feedback**: User sees response as it's generated
- **Cancellable**: Can abort mid-stream
- **Memory efficient**: Streaming state separate from history
- **Nested tracking**: Tool calls tracked hierarchically

### 4. V2 Conversation Architecture

**Why?**
- **Memory optimization**: Only active conversation in memory
- **Fast startup**: Metadata loaded once (lightweight)
- **Lazy loading**: Messages loaded on demand
- **Persistence**: Messages survive page refresh

**Before V2**:
```
All conversations + all messages loaded at startup
= Slow startup + High memory usage
```

**After V2**:
```
Metadata loaded at startup (lightweight)
Messages loaded only for active conversation
= Fast startup + Low memory usage
```

### 5. Plugin Communication via PostMessage

**Why?**
- **Security**: Plugin runs in isolated context
- **Browser standard**: Works across all browsers
- **Asynchronous**: Non-blocking communication
- **Bidirectional**: Both sides can send messages

### 6. AI SDK (Vercel)

**Why?**
- **Provider agnostic**: Works with OpenAI, OpenRouter, etc.
- **Streaming built-in**: Native streaming support
- **Tool calling**: First-class tool/agent support
- **Type safety**: Full TypeScript support
- **Active development**: Regular updates and improvements

### 7. Zod for Schema Validation

**Why?**
- **Type safety**: TypeScript types from schemas
- **Runtime validation**: Catch errors early
- **Composable**: Build complex schemas from simple ones
- **AI SDK integration**: Native support in AI SDK
- **Developer experience**: Clear error messages

### 8. Component Memoization

**Why?**
- **Performance**: Static messages don't re-render during streaming
- **Smooth UX**: Only streaming message updates
- **Memory efficient**: Reduce React reconciliation work

```javascript
// MessageHistory is memoized
const MessageHistory = React.memo(({ messages }) => {
  // Only re-renders when messages array changes
  return messages.map(msg => <Message key={msg.id} {...msg} />);
});

// StreamingMessageView always re-renders
function StreamingMessageView({ streamingMessage }) {
  // Re-renders on every chunk
  return <Message {...streamingMessage} />;
}
```

## Performance Considerations

### 1. Lazy Initialization

- Tools initialized only when `$isConnected` becomes true
- RAG databases loaded on first use
- Agent instances created on demand

### 2. Message Pagination

- Messages loaded per conversation
- Can implement pagination if needed (infrastructure ready)

### 3. Stream Optimization

- Debounced UI updates during fast streaming
- Memoized static content
- Efficient diff-based updates

### 4. Memory Management

- Streaming state cleared after finalization
- Old conversations unloaded when switching
- Orphaned localStorage entries cleaned up

## Security Considerations

### 1. API Keys

- Stored only in browser localStorage
- Never sent to backend (no backend!)
- User controls their own keys
- `dangerouslyAllowBrowser: true` acceptable for plugins

### 2. Plugin Isolation

- Plugin runs in Penpot's sandboxed environment
- No direct DOM access between contexts
- Communication only via postMessage
- Penpot enforces plugin permissions

### 3. Input Validation

- All tool inputs validated with Zod schemas
- Plugin messages validated before processing
- User inputs sanitized in Markdown rendering

### 4. Dependencies

- Regular dependency audits recommended
- Minimal dependency footprint
- No server-side components

## Extensibility

### Adding New Agents

1. Define agent in `src/assets/directorAgents.ts` or `specializedAgents.ts`
2. Agent automatically initialized on next app load
3. No code changes needed in stores or components

### Adding New Tools

1. Define tool in `src/assets/functionTools.ts`, `ragTools.ts`, or `drawingTools.ts`
2. Tool automatically initialized
3. Add tool ID to agent's `toolIds` array

### Adding New Models

1. Add provider in `src/utils/modelUtils.ts`
2. Models automatically fetched and displayed in settings

### Adding Custom Plugin Operations

1. Add message type to `src/types/types.ts`
2. Add handler in `src/plugin/mainHandlers.ts` or `drawHandlers.ts`
3. Create tool wrapper in `src/assets/functionTools.ts`

## Testing Strategy

### Unit Tests

- `src/utils/messagesUtils.test.ts` - Message parsing and formatting
- Future: Tool execution tests
- Future: Store logic tests

### Integration Tests

- Future: Agent orchestration tests
- Future: Plugin communication tests

### Manual Testing

- Test in actual Penpot environment
- Verify shape creation
- Test streaming and cancellation
- Verify conversation persistence

## Future Architecture Improvements

### 1. Plugin Backend

Move heavy operations to plugin context:
- RAG search could run in plugin
- Reduce postMessage overhead

### 2. Worker Threads

Offload intensive operations:
- Vector embeddings in worker
- Large data processing

### 3. Caching Layer

Reduce API calls:
- Cache RAG results
- Cache agent responses for common queries

### 4. Analytics

Track usage:
- Tool call frequency
- Agent performance
- Error rates

### 5. Plugin Marketplace

Extensibility system:
- User-installable agents
- Community-contributed tools
- Agent templates

---

**Next**: See [CODE_STRUCTURE.md](./CODE_STRUCTURE.md) for detailed file organization and [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) for state architecture details.
