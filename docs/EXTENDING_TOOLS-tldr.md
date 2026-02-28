# Extending Tools — TL;DR

> For the full picture see [EXTENDING_TOOLS.md](EXTENDING_TOOLS.md).

## Tool Structure

Every tool (function, drawing, RAG, icon, token) has the same shape:

```javascript
{
  id: "my-tool-id",             // kebab-case, unique
  name: "myToolName",            // camelCase — the AI sees this as the function name
  description: `...`,            // When/how to use this tool (AI routing signal)
  inputSchema: z.object({...}),  // Zod schema; use .describe() on every field
  function: async (input) => {}  // Implementation
}
```

## File Locations

| Kind | File | Key tools |
|------|------|-----------|
| Function | `src/assets/functionTools.js` | Data retrieval, API calls, non-visual |
| Create shapes | `src/assets/toolsCreateShapes.js` | create-rectangle, create-ellipse, create-text, create-path, create-board |
| Modify shapes | `src/assets/toolsModifyShapes.js` | modify-*, rotate-shape, clone-shape, delete-shape |
| Compound | `src/assets/toolsCompoundShapes.js` | group-shapes, create-boolean, convert-to-board/component |
| Layout | `src/assets/toolsLayoutShapes.js` | align-shapes, distribute-shapes |
| Interactions | `src/assets/toolsInteractions.js` | add-navigate-to-interaction, etc. |
| Flows | `src/assets/toolsFlows.js` | create-flow, remove-flow |
| Reorder | `src/assets/toolsReorderShapes.js` | bring-to-front, send-to-back |
| Tokens | `src/assets/toolsTokens.js` | get/create/activate/remove/modify/apply tokens |
| Icons | `src/assets/iconsTool.js` | draw-icon |
| RAG | `src/assets/ragTools.js` | Vector search over Orama databases |
| Barrel | `src/assets/tools.js` | Re-exports all tools — add new categories here |

## Adding a Function Tool (4 steps)

1. **Define the tool** in `functionTools.js` — add to the `functionTools` array
2. **Add plugin support** if needed: add a `ClientQueryType` in `src/types/types.js` + handler in `mainHandlers.js` (see [PLUGIN_COMMUNICATION-tldr.md](PLUGIN_COMMUNICATION-tldr.md))
3. **Call the plugin** via `sendMessageToPlugin(ClientQueryType.YOUR_TYPE, payload)`
4. **Register** — add the tool `id` to `toolIds` in the target agent definition

## Registering with an Agent

```javascript
// src/assets/agents/penpotWizardAgent.js or directorAgents.js
{
  id: "test-tools-director",
  toolIds: [
    "get-user-data",
    "my-custom-tool",   // ← add here
  ],
}
```

## Key Rules

- **Descriptions are routing signals**: the LLM reads the description to decide when to call the tool. Write for the model, not the developer.
- **Zod `.describe()` on every field**: required for good AI parameter inference.
- **Error shape**: `{ ...ToolResponse, success: false, message: '...', payload: { error } }`
- **Stacking order**: create foreground shapes first, backgrounds last.
- **Atomic tools**: one tool, one responsibility. Compose via agents, not tool logic.
