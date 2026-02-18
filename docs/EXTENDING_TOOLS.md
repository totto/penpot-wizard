# Extending Tools

This guide explains how to create and add new tools to Penpot Wizard. All tools (function, RAG, drawing, icons) share the same structure and are registered via the tools store.

## Tool Structure

Every tool follows this structure:

```javascript
{
  id: "my-tool-id",           // kebab-case, unique
  name: "myToolName",          // camelCase, used as tool name for the AI
  description: `...`,          // When and how to use this tool (AI reads this)
  inputSchema: z.object({...}), // Zod schema for parameters
  function: async (input) => {...}  // Implementation
}
```

## File Locations

| Type | File | Purpose |
|------|------|---------|
| Function | `src/assets/functionTools.js` | Data retrieval, API calls, non-visual operations |
| RAG | `src/assets/ragTools.js` | Vector search over embeddings |
| Drawing | `src/assets/drawingTools.js` | Create/modify shapes, boards, components |
| Icons | `src/assets/iconsTool.js` | Draw icons from external libraries |

The barrel file `src/assets/tools.js` exports all tools. Add your new tool array there if you create a new category.

## Function Tools

Function tools execute JavaScript with defined inputs/outputs. They typically call the plugin via `sendMessageToPlugin`.

**Example: Add a new function tool**

1. Open `src/assets/functionTools.js`
2. Add to the `functionTools` array:

```javascript
import { ClientQueryType } from '@/types/types';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { ToolResponse } from '@/types/types';

// In functionTools array:
{
  id: "my-custom-tool",
  name: "myCustomTool",
  description: `
    Use this tool when the user needs [specific capability].
    It does X, Y, and Z.
  `,
  inputSchema: z.object({
    param1: z.string().describe('Description of param1'),
    param2: z.number().optional().describe('Optional param2'),
  }),
  function: async ({ param1, param2 }) => {
    // For plugin operations:
    const response = await sendMessageToPlugin(ClientQueryType.YOUR_QUERY_TYPE, {
      param1,
      param2,
    });
    return response;
    // For pure client-side logic:
    // return { ...ToolResponse, success: true, payload: { result: ... } };
  },
}
```

3. If the tool needs plugin support, add a new `ClientQueryType` in `src/types/types.js` and a handler in `src/plugin/plugin.js` (see [PLUGIN_COMMUNICATION.md](PLUGIN_COMMUNICATION.md)).

## Drawing Tools

Drawing tools create and modify shapes in Penpot. Schemas are defined in `src/types/shapeTypes.js`.

**Existing tools:**
- `create-shapes` – Rectangles, ellipses, paths, text (see [SHAPE_REFERENCE.md](SHAPE_REFERENCE.md))
- `create-component` – Convert shapes into components
- `create-group` – Group shapes
- `create-board` – Create boards with optional shapes
- `convert-group-to-board` – Convert group to board
- `convert-group-to-component` – Convert group to component
- `convert-board-to-component` – Convert board to component
- `create-boolean` – Boolean ops (union, difference, exclude, intersection)
- `ungroup-shape` – Ungroup a group
- `modify-board`, `modify-component`, `modify-shape` – Edit properties
- `modify-text-range` – Edit text styling ranges
- `rotate-shape`, `clone-shape` – Transform shapes
- `bring-to-front-shape`, `bring-forward-shape`, `send-to-back-shape`, `send-backward-shape` – Z-order
- `delete-shape` – Remove shapes

**Important:** Respect stacking order. Foreground elements should be created first, backgrounds last.

## RAG Tools

RAG tools search vector databases using `initializeOramaDb` and `searchOramaDb` from `src/utils/ragUtils.js`.

**Embedding models:**
- `orama` – Orama's built-in embeddings (no API key for search)
- `openai` – Precomputed OpenAI embeddings (requires API key)

See [CREATING_RAGS.md](CREATING_RAGS.md) for generating databases and adding new RAG tools.

## Icons Tools

The `draw-icon` tool creates icons from external libraries (heroicons, lucide, phosphor, etc.). It uses `iconsToolCatalog.json` for library metadata and `icons-rag` to discover available icons before drawing.

To add support for a new icon library, update `iconsToolCatalog.json` with the library metadata and url patterns.

## Registering Tools with Agents

After creating a tool, add its `id` to the `toolIds` array of the director agent that should use it:

```javascript
// In src/assets/directorAgents.js
{
  id: "test-tools-director",
  // ...
  toolIds: [
    "get-user-data",
    "get-project-data",
    "my-custom-tool",  // Add here
    // ...
  ],
}
```

## Best Practices

- **Descriptions**: Write clear, specific descriptions. The AI uses them to decide when to call the tool.
- **inputSchema**: Use Zod with `.describe()` on each field for better AI understanding.
- **Error handling**: Return `{ ...ToolResponse, success: false, message: '...', payload: { error } }` on failure.
- **Atomic tools**: One tool, one responsibility. Compose via agents.
