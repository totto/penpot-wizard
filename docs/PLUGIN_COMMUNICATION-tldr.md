# Plugin Communication — TL;DR

> For the full picture see [PLUGIN_COMMUNICATION.md](PLUGIN_COMMUNICATION.md).

## Message Flow

```
UI (React iframe)                 Plugin (Penpot context)
       |                                  |
       |  postMessage → ClientQueryType   |
       |  { source, messageId, type,      |
       |    payload }                     |
       |--------------------------------->|
       |                         mainHandlers.js / drawHandlers/
       |  postMessage ← response          |
       |  { source, messageId, success,   |
       |    message, payload }            |
       |<---------------------------------|
```

Messages use a unique `messageId`. The UI matches responses by ID. 30-second timeout.

## Key Types (`src/types/types.js`)

- `MessageSourceName.Client` / `.Plugin` — identifies sender
- `ClientQueryType` — all UI→Plugin query types (enum)
- `PluginMessageType` — Plugin→UI push messages (e.g. `THEME_CHANGE`)

## Adding a New Operation (4 steps)

**1. Add query type** in `src/types/types.js`:
```javascript
export const ClientQueryType = {
  MY_NEW_QUERY: 'MY_NEW_QUERY',
};
```

**2. Implement handler** in `src/plugin/mainHandlers.js` or `src/plugin/drawHandlers/`:
```javascript
export function handleMyNewQuery(payload) {
  try {
    const result = penpot.doSomething(payload.param);
    return { success: true, message: 'Done', payload: { result } };
  } catch (error) {
    return { success: false, message: error.message, payload: { error: error.message } };
  }
}
```

**3. Wire in** `src/plugin/plugin.js`:
```javascript
case ClientQueryType.MY_NEW_QUERY:
  responseMessage = handleMyNewQuery(payload);
  break;
```

**4. Create tool** that calls it via `sendMessageToPlugin`:
```javascript
function: async ({ param }) =>
  sendMessageToPlugin(ClientQueryType.MY_NEW_QUERY, { param })
```

## Sending Messages from the UI

```javascript
import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { ClientQueryType } from '@/types/types';

const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_PAGE, undefined);
// response: { success, message, payload }
```

## Penpot API Quick Reference (plugin context)

| Object | What it provides |
|--------|-----------------|
| `penpot.currentUser` | User info |
| `penpot.currentFile` | Current file / project |
| `penpot.currentPage` | Page and shapes |
| `penpot.selection` | Selected shapes |
| `penpot.fonts` | Available fonts |
| `penpot.createRectangle()` / `createEllipse()` / `createPath()` / `createText(t)` / `createBoard()` | Shape constructors |
| `penpot.ui.sendMessage(msg)` | Push message to UI |
| `penpot.ui.onMessage(cb)` | Receive messages from UI |
