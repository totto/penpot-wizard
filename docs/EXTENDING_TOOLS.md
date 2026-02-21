# Extending Tools

This guide explains how to create and add new tools to Penpot Wizard. All tools (function, RAG, drawing, tokens, icons) share the same structure and are registered via the tools store.

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
| Create shapes | `src/assets/toolsCreateShapes.js` | Create rectangle, ellipse, text, path, board |
| Modify shapes | `src/assets/toolsModifyShapes.js` | Modify existing shapes by type |
| Compound | `src/assets/toolsCompoundShapes.js` | Group, ungroup, convert to board/component, boolean |
| Layout | `src/assets/toolsLayoutShapes.js` | Align, distribute shapes |
| Interactions | `src/assets/toolsInteractions.js` | Prototyping interactions (navigate, close overlay, etc.) |
| Flows | `src/assets/toolsFlows.js` | Create, remove prototype flows |
| Reorder | `src/assets/toolsReorderShapes.js` | Bring/send shapes (z-order) |
| Tokens | `src/assets/toolsTokens.js` | Design tokens (get, create, activate, remove, modify, apply) |
| Icons | `src/assets/iconsTool.js` | Draw icons from external libraries |
| Issued | `src/assets/issuedTools.js` | Tools disabled pending upstream fixes (Penpot) |

The barrel file `src/assets/tools.js` exports all tools. Add your new tool array there if you create a new category. Tools in `issuedTools.js` are not exported to the tools store until their upstream issues are resolved.

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

**Create shapes (toolsCreateShapes):**
- `create-rectangle`, `create-ellipse`, `create-text`, `create-path`, `create-board` – Create shapes one at a time

**Compound shapes (toolsCompoundShapes):**
- `group-shapes` – Group shapes by IDs
- `ungroup` – Ungroup a group
- `convert-to-board` – Convert shapes to board
- `convert-to-component` – Convert shapes to component
- `create-boolean` – Boolean ops (union, difference, exclude, intersection)

**Layout (toolsLayoutShapes):**
- `align-shapes` – Align shapes (horizontal/vertical)
- `distribute-shapes` – Distribute shapes with equal spacing

**Interactions (toolsInteractions):**
- `add-navigate-to-interaction`, `add-close-overlay-interaction`, `add-previous-screen-interaction`, `add-open-url-interaction` – Prototyping interactions

**Flows (toolsFlows):**
- `create-flow`, `remove-flow` – Prototype flows

**Modify shapes (toolsModifyShapes):**
- `modify-rectangle`, `modify-ellipse`, `modify-text`, `modify-path`, `modify-board`, `modify-boolean` – Edit properties by shape type
- `modify-text-range` – Edit text styling ranges
- `rotate-shape`, `clone-shape`, `delete-shape` – Transform and delete

**Reorder (toolsReorderShapes):**
- `bring-to-front-shape`, `bring-forward-shape`, `send-to-back-shape`, `send-backward-shape` – Z-order

**Tokens (toolsTokens):**
- `get-tokens-sets` – List all design token sets
- `create-tokens-set` – Create a token set with tokens
- `activate-tokens-set` – Activate a set (optionally exclusive)
- `remove-tokens-set` – Remove a token set
- `modify-tokens-set` – Update, add, or remove tokens in a set
- `apply-tokens` – Apply token values to shapes (fill, stroke, font-size, etc.)

**Important:** Respect stacking order. Foreground elements should be created first, backgrounds last.

## RAG Tools

RAG tools search vector databases using `initializeOramaDb` and `searchOramaDb` from `src/utils/ragUtils.js`.

**Embedding models:**
- `orama` – Orama's built-in embeddings (no API key for search)
- `openai` – Precomputed OpenAI embeddings (requires API key)

See [CREATING_RAGS.md](CREATING_RAGS.md) for generating databases and adding new RAG tools.

## Icons Tools

The `draw-icon` tool creates icons from external libraries (heroicons, lucide, phosphor, etc.). It uses `iconsToolCatalog.json` for library metadata and `get-icon-list` to obtain the list of available icon names before drawing. Icon lists are pre-generated `.txt` files in `public/icon-lists/` (run `node scripts/generateIconLists.js` to regenerate).

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
