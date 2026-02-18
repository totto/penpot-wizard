# Plugin Communication

Penpot Wizard uses a bidirectional message system between the UI (iframe) and the plugin (Penpot context). This document explains the protocol and how to add new operations.

## Message Flow

```
UI (React)                    Plugin (Penpot)
    |                               |
    |  1. postMessage(query)        |
    |  source: penpotWizardClient   |
    |  messageId, type, payload     |
    |------------------------------>|
    |                               |
    |                         2. Handler processes
    |                            (mainHandlers, drawHandlers)
    |                               |
    |  3. postMessage(response)    |
    |  source: penpotWizardPlugin   |
    |  messageId, success, payload  |
    |<------------------------------|
    |                               |
```

## Types and Sources

**Defined in** `src/types/types.js`:

- `MessageSourceName.Client` / `MessageSourceName.Plugin` – Identify sender
- `ClientQueryType` – Enum of all query types from UI to plugin
- `PluginMessageType` – Messages from plugin to UI (e.g. `THEME_CHANGE`)

## ClientQueryType Reference

| Type | Handler | Purpose |
|------|---------|---------|
| GET_USER_DATA | handleGetUserData | Current user info |
| GET_PROJECT_DATA | handleGetProjectData | Project structure, pages |
| GET_CURRENT_PAGE | getCurrentPage | Page, shapes, components |
| GET_SELECTED_SHAPES | getSelectedShapes | Selected shape IDs |
| DRAW_SHAPE | handleDrawShape | Create rectangle, ellipse, path, text |
| ADD_IMAGE | handleAddImage | Add image to project |
| CREATE_SHAPE_FROM_SVG | handleCreateShapeFromSvg | Create shape from SVG string |
| CREATE_COMPONENT | handleCreateComponent | Create component from shapes |
| CREATE_GROUP | handleCreateGroup | Group shapes |
| CREATE_BOARD | handleCreateBoard | Create board with shapes |
| CONVERT_GROUP_TO_BOARD | handleConvertGroupToBoard | Convert group to board |
| MODIFY_BOARD | handleModifyBoard | Edit board properties |
| MODIFY_COMPONENT | handleModifyComponent | Edit component properties |
| MODIFY_SHAPE | handleModifyShape | Edit shape properties |
| MODIFY_TEXT_RANGE | handleModifyTextRange | Edit text range styling |
| ROTATE_SHAPE | handleRotateShape | Rotate shape |
| CLONE_SHAPE | handleCloneShape | Clone shape or component |
| DELETE_SHAPE | handleDeleteShape | Remove shape |
| BRING_TO_FRONT_SHAPE, etc. | handleBringToFrontShape, etc. | Change z-order |

## Adding a New Operation

1. **Add query type** in `src/types/types.js`:

```javascript
export const ClientQueryType = {
  // ... existing
  MY_NEW_QUERY: 'MY_NEW_QUERY',
};
```

2. **Implement handler** in `src/plugin/mainHandlers.js` or `drawHandlers.js`:

```javascript
export function handleMyNewQuery(payload) {
  try {
    const result = penpot.doSomething(payload.param);
    return {
      success: true,
      message: 'Operation completed',
      payload: { result },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`,
      payload: { error: error.message },
    };
  }
}
```

3. **Wire handler in plugin** `src/plugin/plugin.js`:

```javascript
import { handleMyNewQuery } from './mainHandlers';

// In switch (type):
case ClientQueryType.MY_NEW_QUERY:
  responseMessage = handleMyNewQuery(payload);
  break;
```

4. **Create tool** in `src/assets/functionTools.js`:

```javascript
{
  id: "my-new-tool",
  name: "myNewTool",
  description: "Use this when...",
  inputSchema: z.object({
    param: z.string().describe('...'),
  }),
  function: async ({ param }) => {
    return sendMessageToPlugin(ClientQueryType.MY_NEW_QUERY, { param });
  },
}
```

## Sending Messages from UI

Use `sendMessageToPlugin` from `src/utils/pluginUtils.js`:

```javascript
import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { ClientQueryType } from '@/types/types';

const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_PAGE, undefined);
// response: { success, message, payload }
```

Messages use a unique `messageId` and a 30-second timeout. The response is matched by `messageId`.

## Penpot Plugin API

The plugin runs in Penpot's context and has access to:

- `penpot.currentUser` – User info
- `penpot.currentFile` – Current file/project
- `penpot.currentPage` – Current page
- `penpot.theme` – Light/dark
- `penpot.fonts` – Available fonts
- `penpot.selection` – Current selection
- `penpot.createRectangle()`, `penpot.createEllipse()`, `penpot.createPath()`, `penpot.createText(text)`, `penpot.createBoard()`
- `penpot.ui.sendMessage(msg)` – Send message to UI
- `penpot.ui.onMessage(callback)` – Receive messages from UI

See [Penpot Plugin API Documentation](https://help.penpot.app/technical-guide/plugins/) for full reference.
