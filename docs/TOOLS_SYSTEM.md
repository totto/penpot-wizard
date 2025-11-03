# Tools System

## Table of Contents
- [Overview](#overview)
- [Tool Types](#tool-types)
- [Function Tools](#function-tools)
- [RAG Tools](#rag-tools)
- [Drawing Tools](#drawing-tools)
- [Creating Custom Tools](#creating-custom-tools)
- [Tool Best Practices](#tool-best-practices)

## Overview

Tools are the atomic capabilities that agents can use to interact with Penpot, search documentation, generate images, and perform computations. Penpot Wizard supports four types of tools:

1. **Function Tools**: Execute JavaScript functions
2. **RAG Tools**: Search vector databases
3. **Drawing Tools**: Create Penpot shapes
4. **Agent Tools**: Wrapped specialized agents

### Tool Architecture

```
┌────────────────────────────────────────┐
│         TOOL DEFINITIONS               │
│  src/assets/                           │
│  - functionTools.ts                    │
│  - ragTools.ts                         │
│  - drawingTools.ts                     │
└────────────┬───────────────────────────┘
             │
             │ Initialized by
             ▼
┌────────────────────────────────────────┐
│         TOOLS STORE                    │
│  src/stores/toolsStore.ts              │
│  - Initialize tool instances           │
│  - Wrap with AI SDK tool()             │
│  - Manage tool state                   │
└────────────┬───────────────────────────┘
             │
             │ Used by
             ▼
┌────────────────────────────────────────┐
│         AGENTS                         │
│  - Directors                           │
│  - Coordinators                        │
│  - Specialists                         │
└────────────────────────────────────────┘
```

## Tool Types

### Comparison Matrix

| Feature | Function Tools | RAG Tools | Drawing Tools | Agent Tools |
|---------|---------------|-----------|---------------|-------------|
| Executes code | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (calls agent) |
| Searches data | ❌ No | ✅ Yes | ❌ No | ❌ No |
| Creates shapes | ❌ No | ❌ No | ✅ Yes | ❌ No |
| Needs plugin | Sometimes | ❌ No | ✅ Yes | Depends |
| Streaming | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Input schema | ✅ Required | ✅ Required | ✅ Required | ✅ Required |
| Output schema | ❌ Optional | ❌ No | ❌ No | ✅ Optional |

## Function Tools

### Definition Structure

**File**: `src/assets/functionTools.ts`

```typescript
export interface FunctionTool {
  id: string;                          // Unique identifier
  name: string;                        // Tool name for AI (camelCase)
  description: string;                 // When and how to use this tool
  inputSchema: z.ZodObject<any>;       // Zod schema for inputs
  function: (params: any) => Promise<any>; // Tool implementation
  instance?: CoreTool;                 // AI SDK tool instance (auto-created)
}

export const functionTools: FunctionTool[] = [
  // Tool definitions here
];
```

### Example: Get User Data

```typescript
{
  id: 'get-user-data',
  name: 'getUserData',
  description: `
    Use this tool to get information about the current Penpot user.

    Returns:
    - User name
    - User ID
    - Email (if available)

    This tool requires no parameters.
  `,
  inputSchema: z.object({
    // No parameters needed
  }),
  function: async () => {
    const response = await sendMessageToPlugin(
      ClientQueryType.GET_USER_DATA
    );

    if (!response.success) {
      throw new Error('Failed to get user data');
    }

    return {
      name: response.data.name,
      id: response.data.id,
      email: response.data.email
    };
  }
}
```

### Example: Get Project Data

```typescript
{
  id: 'get-project-data',
  name: 'getProjectData',
  description: `
    Use this tool to get complete information about the current Penpot project.

    Returns:
    - Project name and ID
    - Pages list with IDs and names
    - Shapes on current page
    - Available fonts
    - Color palette

    This tool requires no parameters.
  `,
  inputSchema: z.object({}),
  function: async () => {
    const response = await sendMessageToPlugin(
      ClientQueryType.GET_PROJECT_DATA
    );

    if (!response.success) {
      throw new Error('Failed to get project data');
    }

    return response.data;
  }
}
```

### Example: Custom Calculation Tool

```typescript
{
  id: 'calculate-responsive-sizes',
  name: 'calculateResponsiveSizes',
  description: `
    Calculate responsive sizes for different breakpoints.

    Given a base size, calculates appropriate sizes for:
    - Mobile (320px - 480px)
    - Tablet (481px - 768px)
    - Desktop (769px - 1024px)
    - Large Desktop (1025px+)

    INPUT: Base size in pixels
    OUTPUT: Object with sizes for each breakpoint
  `,
  inputSchema: z.object({
    baseSize: z.number().describe('Base size in pixels'),
    scaleRatio: z.number().optional().describe('Scale ratio (default 1.2)')
  }),
  function: async ({ baseSize, scaleRatio = 1.2 }) => {
    return {
      mobile: Math.round(baseSize / scaleRatio),
      tablet: baseSize,
      desktop: Math.round(baseSize * scaleRatio),
      largeDesktop: Math.round(baseSize * scaleRatio * scaleRatio)
    };
  }
}
```

### Initialization

**File**: `src/stores/toolsStore.ts`

```typescript
export function initializeTools() {
  const functionToolsInit = functionTools.map(t => ({
    ...t,
    instance: tool({
      description: t.description,
      parameters: t.inputSchema,
      execute: async (params) => {
        try {
          const result = await t.function(params);
          return result;
        } catch (error) {
          console.error(`Tool ${t.id} failed:`, error);
          throw error;
        }
      }
    })
  }));

  // Update store
  $toolsData.set({
    ...$toolsData.get(),
    functionTools: functionToolsInit
  });
}
```

## RAG Tools

### What is RAG?

**RAG** (Retrieval-Augmented Generation) enhances AI responses with relevant information from a knowledge base using vector search.

**How it works:**
1. Documents are pre-processed and embedded (vector representations)
2. Database is compressed and stored
3. User query is embedded
4. Vector search finds similar documents
5. Results are provided to AI as context

### Definition Structure

**File**: `src/assets/ragTools.ts`

```typescript
export interface RagTool {
  id: string;                          // Unique identifier
  name: string;                        // Tool name for AI
  ragContentFile: string;              // Compressed database file (in public/)
  description: string;                 // When and how to use this tool
  instance?: CoreTool;                 // AI SDK tool instance
  database?: Orama;                    // Orama database instance
}

export const ragTools: RagTool[] = [
  // RAG tool definitions
];
```

### Example: Penpot User Guide RAG

```typescript
{
  id: 'penpot-user-guide-rag',
  name: 'penpotUserGuideRag',
  ragContentFile: 'penpotRagToolContents.zip',
  description: `
    Use this tool to search the official Penpot user guide and documentation.

    IMPORTANT: All queries to this tool MUST be in English.

    QUERY CONSTRUCTION RULES:
    - Expand user queries with specific technical terms
    - Include multiple relevant concepts
    - Use format: "[user intent] + [specific features] + [context]"

    Available topics in the database:
    - Workspace and interface navigation
    - Shape tools (rectangles, ellipses, paths, text)
    - Styling and fills
    - Typography and text
    - Components and assets
    - Prototyping and interactions
    - Export and sharing
    - Flex layout
    - Grid layout
    - Plugins system

    QUERY EXAMPLES:

    ❌ BAD: "how to draw"
    ✅ GOOD: "how to draw shapes using rectangle tool ellipse tool path tool with fills and strokes"

    ❌ BAD: "text"
    ✅ GOOD: "text tool typography fonts text styles formatting alignment"

    ❌ BAD: "layout"
    ✅ GOOD: "flex layout grid layout auto-layout responsive design constraints"

    The tool will return relevant documentation excerpts with:
    - Page title
    - Content snippet
    - URL for reference
    - Breadcrumbs (section path)
  `
}
```

### Creating the RAG Database

**Step 1: Prepare Documents**

```typescript
// scripts/buildRagDatabase.ts

import { create, insert, save } from '@orama/orama';
import { persistToFile } from '@orama/plugin-data-persistence';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create database
const db = await create({
  schema: {
    id: 'string',
    heading: 'string',
    summary: 'string',
    text: 'string',
    url: 'string',
    sourcePath: 'string',
    breadcrumbs: 'string',
    embedding: 'vector[1536]',  // OpenAI ada-002 dimension
    hasCode: 'boolean',
    codeLangs: 'string'
  }
});

// Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding;
}

// Insert documents
for (const doc of documents) {
  const embedding = await generateEmbedding(doc.text);

  await insert(db, {
    id: doc.id,
    heading: doc.heading,
    summary: doc.summary,
    text: doc.text,
    url: doc.url,
    sourcePath: doc.sourcePath,
    breadcrumbs: JSON.stringify(doc.breadcrumbs),
    embedding,
    hasCode: doc.hasCode,
    codeLangs: JSON.stringify(doc.codeLangs)
  });
}

// Save and compress
await persistToFile(db, 'binary', 'public/penpotRagToolContents.zip');
```

**Step 2: Place in Public Folder**

```
public/
└── penpotRagToolContents.zip    # Compressed Orama database
```

### Initialization

**File**: `src/stores/toolsStore.ts`

```typescript
async function initializeRagTools() {
  const ragToolsInit = await Promise.all(
    ragTools.map(async (t) => {
      // Load and decompress database
      const db = await initializeDatabase(t.ragContentFile);

      // Create tool instance
      const instance = tool({
        description: t.description,
        parameters: z.object({
          query: z.string().describe('Search query in English')
        }),
        execute: async ({ query }) => {
          // Generate query embedding
          const queryEmbedding = await generateEmbedding(query);

          // Search database
          const results = await search(db, {
            mode: 'hybrid',
            term: query,
            vector: {
              value: queryEmbedding,
              property: 'embedding'
            },
            limit: 10
          });

          // Format results
          return formatSearchResults(results);
        }
      });

      return { ...t, instance, database: db };
    })
  );

  $toolsData.set({
    ...$toolsData.get(),
    ragTools: ragToolsInit
  });
}
```

### Usage by Agents

```typescript
// Director agent system prompt includes:
`
<tools_available>
  - penpotUserGuideRag: Search Penpot documentation
    When user asks questions about Penpot features, use this tool
    to find accurate information from official docs.

    IMPORTANT:
    - Always expand queries with technical terms
    - Query must be in English
    - Include multiple related concepts

    Example:
    User: "How do I make rounded corners?"
    Query: "border radius rounded corners rectangle shape styling corner radius property"
</tools_available>
`

// Agent can then call the tool:
await penpotUserGuideRag({
  query: "border radius rounded corners rectangle shape styling"
});
```

## Drawing Tools

Drawing tools create visual elements in Penpot. They communicate with the plugin via postMessage.

### Definition Structure

**File**: `src/assets/drawingTools.ts`

```typescript
export const drawingTools: FunctionTool[] = [
  // Drawing tool definitions (same structure as FunctionTool)
];
```

### Shared Shape Properties

```typescript
const penpotShapeProperties = z.object({
  parentId: z.string().optional().describe('Parent board/frame ID'),
  x: z.number().describe('X position'),
  y: z.number().describe('Y position'),
  width: z.number().describe('Width'),
  height: z.number().describe('Height'),
  name: z.string().optional().describe('Shape name'),
  borderRadius: z.number().optional().describe('Border radius'),
  rotation: z.number().optional().describe('Rotation in degrees'),
  opacity: z.number().min(0).max(1).optional().describe('Opacity (0-1)'),
  blendMode: z.enum([
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ]).optional().describe('Blend mode'),
  color: z.string().optional().describe('Fill color (hex)'),
  fills: z.array(z.object({
    fillColor: z.string(),
    fillOpacity: z.number().optional()
  })).optional().describe('Multiple fills'),
  strokes: z.array(z.object({
    strokeColor: z.string(),
    strokeWidth: z.number(),
    strokeOpacity: z.number().optional(),
    strokeStyle: z.enum(['solid', 'dotted', 'dashed']).optional()
  })).optional().describe('Strokes'),
  backgroundImage: z.string().optional().describe('Image ID from imageGenerator')
});
```

### Example: Rectangle Maker

```typescript
{
  id: 'rectangle-maker',
  name: 'rectangleMaker',
  description: `
    Use this tool to draw a rectangle in Penpot.

    Rectangles can be used for:
    - Backgrounds
    - Buttons
    - Cards
    - Containers
    - Input fields

    You can style with:
    - Fill colors
    - Strokes (borders)
    - Border radius (rounded corners)
    - Shadows
    - Opacity
    - Background images

    STACKING ORDER:
    - Newly drawn shapes appear BELOW existing shapes
    - Draw backgrounds FIRST
    - Draw foreground elements LAST
  `,
  inputSchema: penpotShapeProperties.extend({
    // Rectangle-specific properties can be added here
  }),
  function: async (shapeProperties) => {
    const response = await sendMessageToPlugin(
      ClientQueryType.DRAW_SHAPE,
      {
        shapeType: PenpotShapeType.RECTANGLE,
        params: shapeProperties
      }
    );

    if (!response.success) {
      throw new Error('Failed to create rectangle');
    }

    return {
      success: true,
      shapeId: response.data.shape.id,
      message: `Rectangle created at (${shapeProperties.x}, ${shapeProperties.y})`
    };
  }
}
```

### Example: Text Maker

```typescript
{
  id: 'text-maker',
  name: 'textMaker',
  description: `
    Use this tool to create text elements in Penpot.

    Text can be:
    - Headings
    - Body text
    - Labels
    - Button text
    - Captions

    Styling options:
    - Font family (use getAvailableFonts first)
    - Font size
    - Font weight
    - Text color
    - Text alignment
    - Line height
    - Letter spacing
  `,
  inputSchema: penpotShapeProperties.extend({
    text: z.string().describe('Text content'),
    fontFamily: z.string().describe('Font family name'),
    fontSize: z.number().describe('Font size in pixels'),
    fontWeight: z.string().optional().describe('Font weight (normal, bold, etc.)'),
    fontStyle: z.string().optional().describe('Font style (normal, italic)'),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    lineHeight: z.number().optional().describe('Line height multiplier'),
    letterSpacing: z.number().optional().describe('Letter spacing in pixels'),
    textColor: z.string().optional().describe('Text color (hex)')
  }),
  function: async (textProperties) => {
    const response = await sendMessageToPlugin(
      ClientQueryType.DRAW_SHAPE,
      {
        shapeType: PenpotShapeType.TEXT,
        params: textProperties
      }
    );

    if (!response.success) {
      throw new Error('Failed to create text');
    }

    return {
      success: true,
      shapeId: response.data.shape.id,
      message: `Text "${textProperties.text}" created`
    };
  }
}
```

### Example: Path Maker

```typescript
{
  id: 'path-maker',
  name: 'pathMaker',
  description: `
    Use this tool to draw complex custom shapes using paths.

    Paths support:
    - Lines
    - Bezier curves
    - Arcs
    - Complex custom shapes

    Path commands:
    - M (move-to): Move to point
    - L (line-to): Draw line to point
    - C (curve-to): Cubic Bezier curve
    - Q (quadratic-bezier-curve-to): Quadratic Bezier
    - A (elliptical-arc): Arc
    - Z (close-path): Close the path

    See docs/PATH_COMMANDS_GUIDE.md for detailed examples.

    Example path (triangle):
    [
      { command: 'M', params: { x: 0, y: 0 } },
      { command: 'L', params: { x: 100, y: 0 } },
      { command: 'L', params: { x: 50, y: 86.6 } },
      { command: 'Z' }
    ]
  `,
  inputSchema: penpotShapeProperties.extend({
    content: z.array(z.object({
      command: z.enum(['M', 'L', 'C', 'Q', 'A', 'Z', 'H', 'V', 'S', 'T',
        'move-to', 'line-to', 'curve-to', 'close-path',
        'line-to-horizontal', 'line-to-vertical',
        'smooth-curve-to', 'quadratic-bezier-curve-to',
        'smooth-quadratic-bezier-curve-to', 'elliptical-arc']),
      params: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        c1x: z.number().optional(),
        c1y: z.number().optional(),
        c2x: z.number().optional(),
        c2y: z.number().optional(),
        rx: z.number().optional(),
        ry: z.number().optional(),
        xAxisRotation: z.number().optional(),
        largeArcFlag: z.boolean().optional(),
        sweepFlag: z.boolean().optional()
      }).optional()
    })).describe('Array of path commands')
  }),
  function: async (pathProperties) => {
    const response = await sendMessageToPlugin(
      ClientQueryType.DRAW_SHAPE,
      {
        shapeType: PenpotShapeType.PATH,
        params: pathProperties
      }
    );

    if (!response.success) {
      throw new Error('Failed to create path');
    }

    return {
      success: true,
      shapeId: response.data.shape.id,
      message: 'Custom path created'
    };
  }
}
```

### Example: Board Maker

```typescript
{
  id: 'board-maker',
  name: 'boardMaker',
  description: `
    Use this tool to create a board (screen/artboard) in Penpot.

    Boards are used as:
    - Screen containers
    - Artboards
    - Frames for components
    - Prototyping screens

    Common sizes:
    - iPhone 14: 390x844
    - iPhone 14 Plus: 428x926
    - Android Phone: 360x800
    - Tablet: 768x1024
    - Desktop: 1920x1080

    All shapes drawn with parentId set to this board
    will be placed inside it.
  `,
  inputSchema: penpotShapeProperties.extend({
    // Board-specific properties
  }),
  function: async (boardProperties) => {
    const response = await sendMessageToPlugin(
      ClientQueryType.DRAW_SHAPE,
      {
        shapeType: PenpotShapeType.BOARD,
        params: boardProperties
      }
    );

    if (!response.success) {
      throw new Error('Failed to create board');
    }

    return {
      success: true,
      boardId: response.data.shape.id,
      message: `Board "${boardProperties.name}" created`
    };
  }
}
```

### Stacking Order

**CRITICAL**: Penpot places newly drawn shapes **BELOW** existing shapes.

```
Drawing Order:
1. Board (container)
2. Background rectangle
3. Card backgrounds
4. Text elements
5. Buttons (foreground)

Visual Result:
┌─────────────────┐  ← Board (drawn first, appears as container)
│ ┌─────────────┐ │  ← Background (drawn second, below cards)
│ │ ┌─────────┐ │ │  ← Card (drawn third, below text)
│ │ │ Text    │ │ │  ← Text (drawn fourth, below button)
│ │ │ [Button]│ │ │  ← Button (drawn last, appears on top)
│ │ └─────────┘ │ │
│ └─────────────┘ │
└─────────────────┘
```

## Creating Custom Tools

### Step 1: Choose Tool Type

- **Function Tool**: For data queries, calculations, API calls
- **RAG Tool**: For document search
- **Drawing Tool**: For creating Penpot shapes

### Step 2: Define Tool

Add to appropriate file in `src/assets/`:

```typescript
{
  id: 'my-custom-tool',
  name: 'myCustomTool',
  description: `
    Clear description of:
    - What this tool does
    - When to use it
    - What it returns
    - Any important notes
  `,
  inputSchema: z.object({
    param1: z.string().describe('Description'),
    param2: z.number().optional().describe('Optional parameter')
  }),
  function: async ({ param1, param2 }) => {
    // Implementation
    return { result: 'success' };
  }
}
```

### Step 3: Add to Agent

Add tool ID to agent's `toolIds`:

```typescript
// In directorAgents.ts or specializedAgents.ts
{
  id: 'my-agent',
  // ...
  toolIds: ['my-custom-tool', 'other-tool']
}
```

### Step 4: Test

Tool is automatically initialized and available to agent.

## Tool Best Practices

### 1. Clear Descriptions

```typescript
// ✅ Good
description: `
  Use this tool to calculate responsive font sizes.

  INPUT: Base font size in pixels
  OUTPUT: Object with sizes for mobile, tablet, desktop

  Example:
  Input: { baseSize: 16 }
  Output: { mobile: 14, tablet: 16, desktop: 18 }
`

// ❌ Bad
description: 'Calculates sizes'
```

### 2. Comprehensive Input Schemas

```typescript
// ✅ Good
inputSchema: z.object({
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i)
    .describe('Hex color code (e.g., #FF5733)'),
  opacity: z.number()
    .min(0)
    .max(1)
    .optional()
    .describe('Opacity between 0 and 1')
})

// ❌ Bad
inputSchema: z.object({
  color: z.string(),
  opacity: z.number()
})
```

### 3. Error Handling

```typescript
// ✅ Good
function: async (params) => {
  try {
    const result = await operation(params);

    if (!result.success) {
      throw new Error(`Operation failed: ${result.error}`);
    }

    return result.data;
  } catch (error) {
    console.error('Tool error:', error);
    throw new Error(`Tool execution failed: ${error.message}`);
  }
}

// ❌ Bad
function: async (params) => {
  return await operation(params); // No error handling
}
```

### 4. Return Structured Data

```typescript
// ✅ Good
return {
  success: true,
  data: {
    id: '123',
    name: 'Result'
  },
  message: 'Operation completed successfully'
};

// ❌ Bad
return 'success'; // Unstructured string
```

### 5. RAG Query Optimization

```typescript
// ✅ Good
query: "flex layout auto-layout responsive design constraints alignment distribution"

// ❌ Bad
query: "layout"
```

### 6. Drawing Tool Sequencing

```typescript
// ✅ Good - correct order
await boardMaker({ name: 'Screen', ... });
await rectangleMaker({ /* background */ });
await rectangleMaker({ /* card */ });
await textMaker({ /* heading */ });
await rectangleMaker({ /* button */ });

// ❌ Bad - wrong order
await rectangleMaker({ /* button */ });  // Will be at bottom!
await textMaker({ /* heading */ });
await rectangleMaker({ /* card */ });
await rectangleMaker({ /* background */ });
await boardMaker({ name: 'Screen' });
```

---

**Next**: See [PLUGIN_COMMUNICATION.md](./PLUGIN_COMMUNICATION.md) for plugin integration details and [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
