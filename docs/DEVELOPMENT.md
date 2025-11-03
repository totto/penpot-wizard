# Development Guide

## Table of Contents
- [Setup](#setup)
- [Development Workflow](#development-workflow)
- [Build System](#build-system)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Performance](#performance)

## Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended (with extensions)
- **Penpot Account**: For testing the plugin
- **API Keys**: OpenAI or OpenRouter API key

### Initial Setup

#### 1. Clone Repository

```bash
git clone https://github.com/YourOrg/penpot-wizard.git
cd penpot-wizard
```

#### 2. Install Dependencies

```bash
npm install
```

This installs:
- React and React DOM
- Vercel AI SDK
- Nanostores
- Orama (vector database)
- Zod (schema validation)
- TypeScript
- Vite
- Testing libraries

#### 3. Environment Configuration

No `.env` file needed! API keys are stored in browser localStorage via the settings UI.

### VS Code Setup

#### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

Install all:
1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Extensions: Show Recommended Extensions"
3. Click "Install All"

#### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Verify Setup

```bash
# Run build
npm run build

# Should complete without errors
# Output in dist/ folder
```

## Development Workflow

### Development Modes

#### Mode 1: Web Development (No Plugin)

For UI-only development:

```bash
npm run dev
```

- Opens browser at `http://localhost:5174`
- Hot reload on file changes
- UI only (no Penpot plugin features)
- Good for component development

#### Mode 2: Penpot Plugin Development

For full plugin development:

```bash
npm run dev:penpot
```

This command:
1. Builds plugin file (`dist/plugin.js`)
2. Starts Vite dev server (UI with hot reload)
3. Watches for changes and rebuilds plugin

**Then in Penpot:**
1. Open Penpot (https://penpot.app)
2. Go to any project
3. Menu → Plugins → Manage plugins
4. Click "Install from file"
5. Select `dist` folder from penpot-wizard

**Plugin auto-reloads** when you make changes to plugin code.

### Typical Development Session

```bash
# Terminal 1: Start development server
npm run dev:penpot

# Terminal 2: Run tests in watch mode
npm test -- --watch

# Terminal 3: Available for git commands, etc.
```

### File Watching

The dev server watches:
- `src/**/*.{js,jsx,ts,tsx}` - Recompiles UI
- `src/plugin/**/*.ts` - Rebuilds plugin
- `src/assets/**/*.ts` - Recompiles agent definitions
- `src/stores/**/*.ts` - Recompiles stores

Hot reload applies immediately for UI changes. Plugin changes require manual refresh in Penpot.

## Build System

### Build Configurations

Two separate Vite configs:

#### 1. UI Build (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── icon.svg
├── manifest.json
└── penpotRagToolContents.zip
```

#### 2. Plugin Build (`vite.config.plugin.ts`)

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/plugin/plugin.ts',
      name: 'penpotWizardPlugin',
      fileName: 'plugin',
      formats: ['iife']
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['penpot'],
      output: {
        globals: {
          penpot: 'penpot'
        }
      }
    }
  }
});
```

**Output:**
```
dist/
└── plugin.js    # IIFE bundle
```

### Build Commands

```bash
# Build everything (plugin + UI)
npm run build

# Build only plugin
vite build -c vite.config.plugin.ts

# Build only UI
vite build

# Build and watch (development)
npm run dev:penpot
```

### Build Process

```
┌─────────────────────────────────────────┐
│  SOURCE CODE                            │
│  src/                                   │
│  ├── plugin/                            │
│  ├── components/                        │
│  ├── stores/                            │
│  └── assets/                            │
└────────┬────────────────────────────────┘
         │
         ├─────────────────┬─────────────────
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│  PLUGIN BUILD   │  │    UI BUILD      │
│  vite.config    │  │  vite.config.js  │
│    .plugin.ts   │  │                  │
└────────┬────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌──────────────────┐
│  dist/plugin.js │  │  dist/           │
│  (IIFE)         │  │  ├── index.html  │
│                 │  │  ├── assets/     │
│                 │  │  ├── manifest.json│
│                 │  │  └── icon.svg    │
└─────────────────┘  └──────────────────┘
```

### Dependencies

#### Production Dependencies

```json
{
  "@ai-sdk/openai": "AI SDK OpenAI provider",
  "@openrouter/ai-sdk-provider": "AI SDK OpenRouter provider",
  "ai": "Vercel AI SDK (agents, tools, streaming)",
  "@orama/orama": "Vector database for RAG",
  "nanostores": "State management",
  "@nanostores/react": "React bindings for nanostores",
  "@nanostores/persistent": "Persistent atoms",
  "react": "UI framework",
  "react-dom": "React DOM rendering",
  "zod": "Schema validation",
  "openai": "OpenAI client (for embeddings)",
  "react-markdown": "Markdown rendering"
}
```

#### Development Dependencies

```json
{
  "vite": "Build tool",
  "@vitejs/plugin-react": "React plugin for Vite",
  "typescript": "TypeScript compiler",
  "eslint": "Linting",
  "vitest": "Testing framework",
  "@vitest/ui": "Test UI"
}
```

## Project Structure

```
penpot-wizard/
├── public/                      # Static assets (copied to dist/)
│   ├── manifest.json           # Plugin manifest
│   ├── icon.svg                # Plugin icon
│   └── penpotRagToolContents.zip # RAG database
│
├── src/
│   ├── assets/                 # Configurations (agents, tools)
│   ├── components/             # React components
│   ├── plugin/                 # Penpot plugin code
│   ├── stores/                 # State management
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utility functions
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
│
├── docs/                       # Documentation
├── dist/                       # Build output (gitignored)
├── node_modules/               # Dependencies (gitignored)
│
├── package.json                # Project metadata
├── vite.config.js              # Vite config (UI)
├── vite.config.plugin.ts       # Vite config (plugin)
├── vitest.config.ts            # Test config
├── eslint.config.js            # ESLint config
├── tsconfig.json               # TypeScript config
└── README.md                   # Project README
```

See [CODE_STRUCTURE.md](./CODE_STRUCTURE.md) for detailed file organization.

## Testing

### Test Framework

We use **Vitest** (Vite-native test runner):

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# UI mode (interactive)
npm run test:ui

# Coverage
npm test -- --coverage

# Specific file
npm test src/utils/messagesUtils.test.ts
```

### Test Structure

Tests live next to code:

```
src/utils/
├── messagesUtils.ts
└── messagesUtils.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from './myModule';

describe('myModule', () => {
  describe('myFunction', () => {
    beforeEach(() => {
      // Setup before each test
    });

    it('should do something', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = myFunction('');
      expect(result).toBe('');
    });
  });
});
```

### Testing Stores

```typescript
import { describe, it, expect } from 'vitest';
import { $count, increment } from './counterStore';

describe('counterStore', () => {
  it('should increment count', () => {
    // Get initial value
    const initial = $count.get();

    // Call action
    increment();

    // Check updated value
    expect($count.get()).toBe(initial + 1);
  });
});
```

### Testing Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click', () => {
    const { container } = render(<MyComponent />);
    const button = container.querySelector('button');

    fireEvent.click(button);

    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Debugging

### Browser DevTools

#### Console Logging

Add strategic logs:

```typescript
// Store updates
$activeConversationId.subscribe((id) => {
  console.log('[STORE] Active conversation changed:', id);
});

// Tool execution
function: async (params) => {
  console.log('[TOOL] Executing with params:', params);
  const result = await operation(params);
  console.log('[TOOL] Result:', result);
  return result;
}

// Agent streaming
for await (const chunk of stream) {
  console.log('[STREAM] Chunk:', chunk.type, chunk);
}
```

#### React DevTools

Install React DevTools extension:
1. Open DevTools
2. Go to "Components" tab
3. Inspect component props/state
4. View hooks state

#### Network Tab

Monitor postMessage:

```typescript
// Add to main.jsx
window.addEventListener('message', (event) => {
  console.log('[MESSAGE]', {
    source: event.data.source,
    type: event.data.type,
    data: event.data
  });
});
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:5174",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    }
  ]
}
```

Then:
1. Set breakpoints in VS Code
2. Press F5 to start debugging
3. Chrome opens with debugger attached

### Plugin Debugging

Plugin code runs in Penpot's context:

1. Open Penpot DevTools (F12)
2. Plugin logs appear in console
3. Set breakpoints in plugin.js (if source maps available)

### Common Debugging Scenarios

#### Issue: Agent not responding

**Check:**
```typescript
// 1. Is agent initialized?
console.log('Agent instance:', director.instance);

// 2. Are tools available?
console.log('Tools:', Object.keys(tools));

// 3. Is API key set?
console.log('API Key:', $openaiApiKey.get() ? 'SET' : 'NOT SET');

// 4. Is model selected?
console.log('Model:', $selectedLanguageModel.get());
```

#### Issue: Tool not working

**Check:**
```typescript
// 1. Is tool in store?
console.log('Tool:', getToolById('my-tool'));

// 2. Can agent access tool?
console.log('Agent tools:', agent.toolIds);

// 3. Test tool directly
const result = await tool.function({ param: 'test' });
console.log('Tool result:', result);
```

#### Issue: Streaming not working

**Check:**
```typescript
// 1. Is streaming message initialized?
console.log('Streaming:', $streamingMessage.get());

// 2. Is stream handler called?
for await (const chunk of stream) {
  console.log('Chunk type:', chunk.type);
  // Should see: text-delta, tool-call, tool-result, finish
}

// 3. Check abort signal
console.log('Aborted?', abortSignal.aborted);
```

## Common Tasks

### Adding a New Agent

1. **Define agent** in `src/assets/directorAgents.ts`:

```typescript
{
  id: 'my-new-agent',
  name: 'MyNewAgent',
  description: '...',
  system: `...`,
  toolIds: ['tool-1'],
  specializedAgentIds: ['specialist-1']
}
```

2. **Restart dev server** (agents initialized on startup)

3. **Test in UI**:
   - Select new agent in sidebar
   - Start conversation
   - Verify behavior

### Adding a New Tool

1. **Define tool** in appropriate file:

```typescript
// src/assets/functionTools.ts
{
  id: 'my-new-tool',
  name: 'myNewTool',
  description: '...',
  inputSchema: z.object({ ... }),
  function: async (params) => { ... }
}
```

2. **Add to agent** (if not auto-included):

```typescript
{
  id: 'my-agent',
  toolIds: ['my-new-tool', ...]
}
```

3. **Test**:
   - Agent should be able to call tool
   - Check tool execution in logs

### Adding Plugin Operation

See [PLUGIN_COMMUNICATION.md](./PLUGIN_COMMUNICATION.md#adding-new-operations) for detailed steps.

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm install package@latest

# Update all (careful!)
npm update

# After updating, test thoroughly
npm test
npm run build
```

### Database Changes

If you need to update the RAG database:

1. **Update build script** (create if needed):

```typescript
// scripts/buildRagDatabase.ts
import { create, insert } from '@orama/orama';
import { persistToFile } from '@orama/plugin-data-persistence';

// ... build database
await persistToFile(db, 'binary', 'public/penpotRagToolContents.zip');
```

2. **Run build script**:

```bash
ts-node scripts/buildRagDatabase.ts
```

3. **Commit new database file**

## Troubleshooting

### Build Errors

#### Error: "Module not found"

**Solution**: Install missing dependency

```bash
npm install
```

#### Error: "Type error in TypeScript"

**Solution**: Check types, fix errors

```bash
# See full error
npm run build
```

### Runtime Errors

#### Error: "Agent not initialized"

**Cause**: API key missing or model not selected

**Solution**:
1. Open settings
2. Enter API key
3. Click "Check API Keys"
4. Select model

#### Error: "Tool not found"

**Cause**: Tool ID mismatch

**Solution**:
- Check tool `id` matches agent's `toolIds`
- Verify tool is exported from assets file

#### Error: "Timeout waiting for plugin"

**Cause**: Plugin not responding

**Solution**:
1. Refresh Penpot page
2. Check plugin is loaded
3. Check console for errors
4. Increase timeout if operation is slow

### Performance Issues

#### Slow Startup

**Causes**:
- Too many conversations in metadata
- Large RAG database

**Solutions**:
```typescript
// Clean old conversations
export function cleanupOldConversations() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  // Remove old metadata and messages
}
```

#### Slow Streaming

**Causes**:
- Too many re-renders
- Heavy components not memoized

**Solutions**:
```typescript
// Memoize static content
const MessageHistory = React.memo(({ messages }) => {
  // Only re-renders when messages change
});

// Use computed atoms
const $sortedMessages = computed(
  [$messages],
  (msgs) => [...msgs].sort(...)
);
```

## Performance

### Bundle Size

Check bundle size:

```bash
npm run build

# Check dist/assets/ for .js and .css file sizes
ls -lh dist/assets/
```

**Targets**:
- Main JS bundle: < 500KB (gzipped)
- Main CSS bundle: < 50KB (gzipped)
- Plugin bundle: < 100KB

### Optimization Tips

1. **Code splitting**: Vite does this automatically
2. **Tree shaking**: Import only what you need
3. **Lazy loading**: Use dynamic imports for large components
4. **Memoization**: Use React.memo for expensive components
5. **Computed atoms**: Use for derived state

### Profiling

```typescript
// React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="ChatMessages" onRender={(id, phase, duration) => {
  console.log(`${id} (${phase}): ${duration}ms`);
}}>
  <ChatMessages />
</Profiler>
```

---

## Quick Reference

```bash
# Development
npm run dev              # UI only
npm run dev:penpot       # Plugin + UI

# Build
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm test -- --watch      # Watch mode
npm run test:ui          # Interactive UI

# Linting
npm run lint             # Check code style

# Cleaning
rm -rf dist node_modules
npm install
npm run build
```

---

**Next**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture and [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
