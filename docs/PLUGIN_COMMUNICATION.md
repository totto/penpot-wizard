# Plugin Communication System

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Message Protocol](#message-protocol)
- [Plugin Handlers](#plugin-handlers)
- [UI Communication](#ui-communication)
- [Adding New Operations](#adding-new-operations)
- [Debugging](#debugging)
- [Best Practices](#best-practices)

## Overview

Penpot Wizard uses a **bidirectional postMessage protocol** for communication between the React UI (running in an iframe) and the Penpot plugin (running in Penpot's JavaScript context).

### Why postMessage?

1. **Security**: Plugin and UI run in isolated contexts
2. **Browser Standard**: Works across all browsers
3. **Asynchronous**: Non-blocking communication
4. **Bidirectional**: Both sides can send messages

### Communication Flow

```
┌────────────────────────────────────────────────────────┐
│                  PENPOT APPLICATION                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         PLUGIN (plugin.ts)                       │ │
│  │  - Runs in Penpot's JavaScript context          │ │
│  │  - Has access to penpot.* APIs                  │ │
│  │  - Listens to penpot.ui.onMessage()             │ │
│  │  - Sends via penpot.ui.sendMessage()            │ │
│  └─────────┬────────────────────────────────────────┘ │
│            │                                            │
│     postMessage (window messaging)                     │
│            │                                            │
│  ┌─────────▼────────────────────────────────────────┐ │
│  │         UI (React in iframe)                     │ │
│  │  - Runs in iframe context                        │ │
│  │  - No direct access to Penpot APIs               │ │
│  │  - Listens to window.message event               │ │
│  │  - Sends via window.parent.postMessage()         │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Architecture

### Plugin Side

**File**: `src/plugin/plugin.ts`

```typescript
// Initialize plugin
penpot.ui.open('Penpot Wizard', `${BASE_URL}?theme=${penpot.theme}`, {
  width: 280,
  height: 600
});

// Listen to messages from UI
penpot.ui.onMessage<ClientMessage>(async (message: ClientMessage) => {
  const { type, messageId, payload, source } = message;

  // Validate message source
  if (source !== 'penpotWizardClient') {
    return;
  }

  // Prepare response
  let responsePayload: PluginResponsePayload = {
    success: false,
    description: '',
    data: null
  };

  // Route to handler
  switch (type) {
    case ClientQueryType.GET_USER_DATA:
      responsePayload = handleGetUserData();
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responsePayload = handleGetProjectData();
      break;

    case ClientQueryType.DRAW_SHAPE:
      responsePayload = handleDrawShape(payload);
      break;

    case ClientQueryType.ADD_IMAGE:
      responsePayload = await handleAddImage(payload);
      break;

    default:
      responsePayload.description = `Unknown query type: ${type}`;
  }

  // Send response
  sendResponseToClient(messageId, type, responsePayload);
});

// Send response helper
function sendResponseToClient(
  messageId: string,
  type: ClientQueryType,
  payload: PluginResponsePayload
) {
  penpot.ui.sendMessage({
    source: 'penpotWizardPlugin',
    type,
    messageId,
    message: payload.description,
    success: payload.success,
    payload
  });
}
```

### UI Side

**File**: `src/utils/pluginUtils.ts`

```typescript
// Pending messages map (message ID → Promise resolvers)
const pendingMessages = new Map<string, {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}>();

// Send message to plugin
export async function sendMessageToPlugin(
  queryType: ClientQueryType,
  payload?: any,
  timeoutMs: number = 30000
): Promise<PluginResponsePayload> {
  const messageId = generateUUID();

  return new Promise((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      pendingMessages.delete(messageId);
      reject(new Error(`Timeout waiting for plugin response (${queryType})`));
    }, timeoutMs);

    // Store promise resolvers
    pendingMessages.set(messageId, { resolve, reject, timeout });

    // Send message to plugin
    const message: ClientMessage = {
      source: 'penpotWizardClient',
      type: queryType,
      messageId,
      payload
    };

    window.parent.postMessage(message, '*');
  });
}

// Listen to messages from plugin
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data as PluginResponseMessage;

  // Validate message source
  if (message.source !== 'penpotWizardPlugin') {
    return;
  }

  // Find pending promise
  const pending = pendingMessages.get(message.messageId);
  if (!pending) {
    return;
  }

  // Clear timeout
  clearTimeout(pending.timeout);

  // Remove from pending
  pendingMessages.delete(message.messageId);

  // Resolve or reject
  if (message.success) {
    pending.resolve(message.payload);
  } else {
    pending.reject(new Error(message.message));
  }
});
```

## Message Protocol

### Message Types

```typescript
// Query types (UI → Plugin requests)
export enum ClientQueryType {
  GET_USER_DATA = 'GET_USER_DATA',
  GET_PROJECT_DATA = 'GET_PROJECT_DATA',
  GET_CURRENT_PAGE = 'GET_CURRENT_PAGE',
  GET_AVAILABLE_FONTS = 'GET_AVAILABLE_FONTS',
  DRAW_SHAPE = 'DRAW_SHAPE',
  ADD_IMAGE = 'ADD_IMAGE'
}
```

### Client Message Structure

**UI → Plugin**

```typescript
interface ClientMessage {
  source: 'penpotWizardClient';
  type: ClientQueryType;
  messageId: string;            // UUID for matching response
  payload?: any;                // Query-specific data
}

// Example: Draw shape
{
  source: 'penpotWizardClient',
  type: 'DRAW_SHAPE',
  messageId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  payload: {
    shapeType: 'rectangle',
    params: {
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: '#FF5733'
    }
  }
}
```

### Plugin Response Structure

**Plugin → UI**

```typescript
interface PluginResponseMessage {
  source: 'penpotWizardPlugin';
  type: ClientQueryType;         // Same as request type
  messageId: string;             // Same as request messageId
  message: string;               // Human-readable status
  success: boolean;              // Operation success flag
  payload: PluginResponsePayload;
}

interface PluginResponsePayload {
  success: boolean;
  description: string;
  data: any;                     // Response-specific data
}

// Example: Draw shape response
{
  source: 'penpotWizardPlugin',
  type: 'DRAW_SHAPE',
  messageId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  message: 'Shape created successfully',
  success: true,
  payload: {
    success: true,
    description: 'Rectangle created',
    data: {
      shape: {
        id: 'shape-123',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150
      }
    }
  }
}
```

## Plugin Handlers

### Main Handlers

**File**: `src/plugin/mainHandlers.ts`

Data query handlers that access Penpot APIs.

#### Get User Data

```typescript
export function handleGetUserData(): PluginResponsePayload {
  try {
    const user = penpot.currentUser;

    if (!user) {
      return {
        success: false,
        description: 'No user found',
        data: null
      };
    }

    return {
      success: true,
      description: 'User data retrieved',
      data: {
        name: user.name,
        id: user.id,
        email: user.email
      }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error getting user data: ${error}`,
      data: null
    };
  }
}
```

#### Get Project Data

```typescript
export function handleGetProjectData(): PluginResponsePayload {
  try {
    const file = penpot.currentFile;

    if (!file) {
      return {
        success: false,
        description: 'No file found',
        data: null
      };
    }

    // Extract pages
    const pages = file.pages.map(page => ({
      id: page.id,
      name: page.name
    }));

    // Get current page shapes
    const currentPage = penpot.currentPage;
    const shapes = currentPage ? extractShapes(currentPage) : [];

    // Get available fonts
    const fonts = penpot.fonts.map(font => ({
      id: font.id,
      name: font.name,
      family: font.family,
      variants: font.variants
    }));

    return {
      success: true,
      description: 'Project data retrieved',
      data: {
        id: file.id,
        name: file.name,
        pages,
        currentPage: {
          id: currentPage?.id,
          name: currentPage?.name,
          shapes
        },
        fonts
      }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error getting project data: ${error}`,
      data: null
    };
  }
}

function extractShapes(page: Page): ShapeInfo[] {
  const shapes: ShapeInfo[] = [];

  function traverse(shape: Shape) {
    shapes.push({
      id: shape.id,
      name: shape.name,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height
    });

    if ('children' in shape) {
      shape.children.forEach(traverse);
    }
  }

  page.root?.children.forEach(traverse);

  return shapes;
}
```

#### Get Available Fonts

```typescript
export function handleGetAvailableFonts(): PluginResponsePayload {
  try {
    const fonts = penpot.fonts.map(font => ({
      id: font.id,
      name: font.name,
      family: font.family,
      variants: font.variants || []
    }));

    return {
      success: true,
      description: 'Fonts retrieved',
      data: { fonts }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error getting fonts: ${error}`,
      data: null
    };
  }
}
```

### Draw Handlers

**File**: `src/plugin/drawHandlers.ts`

Shape creation handlers.

#### Draw Shape

```typescript
export function handleDrawShape(
  payload: DrawShapeQueryPayload
): PluginResponsePayload {
  try {
    const { shapeType, params } = payload;

    let newShape: Shape | null = null;

    // Create shape based on type
    switch (shapeType) {
      case PenpotShapeType.RECTANGLE:
        newShape = penpot.createRectangle();
        break;

      case PenpotShapeType.ELLIPSE:
        newShape = penpot.createEllipse();
        break;

      case PenpotShapeType.PATH:
        newShape = penpot.createPath();
        break;

      case PenpotShapeType.TEXT:
        newShape = penpot.createText(params.text || '');
        break;

      case PenpotShapeType.BOARD:
        newShape = penpot.createBoard();
        break;

      default:
        return {
          success: false,
          description: `Unknown shape type: ${shapeType}`,
          data: null
        };
    }

    if (!newShape) {
      return {
        success: false,
        description: 'Failed to create shape',
        data: null
      };
    }

    // Apply parameters
    setParamsToShape(newShape, params);

    // Add to parent if specified
    if (params.parentId) {
      const parent = penpot.currentPage?.getShapeById(params.parentId);
      if (parent && 'appendChild' in parent) {
        parent.appendChild(newShape);
      }
    }

    return {
      success: true,
      description: `${shapeType} created successfully`,
      data: {
        shape: {
          id: newShape.id,
          type: newShape.type,
          name: newShape.name
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error creating shape: ${error}`,
      data: null
    };
  }
}

function setParamsToShape(shape: Shape, params: any) {
  // Position and size
  if (params.x !== undefined) shape.x = params.x;
  if (params.y !== undefined) shape.y = params.y;
  if (params.width !== undefined) shape.resize(params.width, shape.height);
  if (params.height !== undefined) shape.resize(shape.width, params.height);

  // Name
  if (params.name) shape.name = params.name;

  // Border radius
  if (params.borderRadius !== undefined && 'borderRadius' in shape) {
    shape.borderRadius = params.borderRadius;
  }

  // Rotation
  if (params.rotation !== undefined) shape.rotation = params.rotation;

  // Opacity
  if (params.opacity !== undefined) shape.opacity = params.opacity;

  // Blend mode
  if (params.blendMode) shape.blendMode = params.blendMode;

  // Fills
  if (params.color) {
    shape.fills = [{ fillColor: params.color, fillOpacity: 1 }];
  } else if (params.fills) {
    shape.fills = params.fills;
  }

  // Strokes
  if (params.strokes) {
    shape.strokes = params.strokes;
  }

  // Background image
  if (params.backgroundImage && 'backgroundImage' in shape) {
    shape.backgroundImage = params.backgroundImage;
  }

  // Text-specific
  if (shape.type === 'text' && 'fontFamily' in shape) {
    if (params.fontFamily) shape.fontFamily = params.fontFamily;
    if (params.fontSize) shape.fontSize = params.fontSize;
    if (params.fontWeight) shape.fontWeight = params.fontWeight;
    if (params.fontStyle) shape.fontStyle = params.fontStyle;
    if (params.textAlign) shape.textAlign = params.textAlign;
    if (params.lineHeight) shape.lineHeight = params.lineHeight;
    if (params.letterSpacing) shape.letterSpacing = params.letterSpacing;
    if (params.textColor) {
      shape.fills = [{ fillColor: params.textColor, fillOpacity: 1 }];
    }
  }

  // Path-specific
  if (shape.type === 'path' && params.content) {
    const svgString = pathCommandsToSvgString(params.content);
    shape.content = svgString;
  }
}
```

#### Add Image

```typescript
export async function handleAddImage(
  payload: AddImageQueryPayload
): Promise<PluginResponsePayload> {
  try {
    const { name, imageUrl } = payload;

    // Fetch image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Penpot
    const imageData = await penpot.uploadMediaData(
      name || 'uploaded-image',
      uint8Array,
      blob.type
    );

    if (!imageData) {
      return {
        success: false,
        description: 'Failed to upload image',
        data: null
      };
    }

    return {
      success: true,
      description: 'Image uploaded successfully',
      data: {
        imageId: imageData.id,
        name: imageData.name
      }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error uploading image: ${error}`,
      data: null
    };
  }
}
```

## UI Communication

### Calling from Tools

**File**: `src/assets/functionTools.ts`

```typescript
{
  id: 'get-user-data',
  name: 'getUserData',
  description: '...',
  inputSchema: z.object({}),
  function: async () => {
    // Send message to plugin
    const response = await sendMessageToPlugin(
      ClientQueryType.GET_USER_DATA
    );

    // Check success
    if (!response.success) {
      throw new Error('Failed to get user data');
    }

    // Return data
    return response.data;
  }
}
```

### Calling from Agents

Agents call tools, which internally use `sendMessageToPlugin`.

## Adding New Operations

### Step 1: Define Message Type

**File**: `src/types/types.ts`

```typescript
export enum ClientQueryType {
  // ... existing types
  MY_NEW_OPERATION = 'MY_NEW_OPERATION'
}
```

### Step 2: Define Payload Types

```typescript
export interface MyNewOperationPayload {
  param1: string;
  param2: number;
}

export type DrawShapeQueryPayload = {
  shapeType: PenpotShapeType;
  params: any;
} | MyNewOperationPayload; // Add to union
```

### Step 3: Create Plugin Handler

**File**: `src/plugin/mainHandlers.ts` or `drawHandlers.ts`

```typescript
export function handleMyNewOperation(
  payload: MyNewOperationPayload
): PluginResponsePayload {
  try {
    const { param1, param2 } = payload;

    // Use Penpot API
    const result = penpot.someOperation(param1, param2);

    return {
      success: true,
      description: 'Operation completed',
      data: { result }
    };
  } catch (error) {
    return {
      success: false,
      description: `Error: ${error}`,
      data: null
    };
  }
}
```

### Step 4: Add to Plugin Router

**File**: `src/plugin/plugin.ts`

```typescript
penpot.ui.onMessage<ClientMessage>(async (message: ClientMessage) => {
  // ...

  switch (type) {
    // ... existing cases

    case ClientQueryType.MY_NEW_OPERATION:
      responsePayload = handleMyNewOperation(payload);
      break;
  }

  // ...
});
```

### Step 5: Create UI Tool

**File**: `src/assets/functionTools.ts`

```typescript
{
  id: 'my-new-tool',
  name: 'myNewTool',
  description: 'Description...',
  inputSchema: z.object({
    param1: z.string(),
    param2: z.number()
  }),
  function: async ({ param1, param2 }) => {
    const response = await sendMessageToPlugin(
      ClientQueryType.MY_NEW_OPERATION,
      { param1, param2 }
    );

    if (!response.success) {
      throw new Error('Operation failed');
    }

    return response.data;
  }
}
```

## Debugging

### Console Logging

**Plugin Side**:
```typescript
console.log('[PLUGIN] Received message:', message);
console.log('[PLUGIN] Sending response:', responsePayload);
```

**UI Side**:
```typescript
console.log('[UI] Sending message:', message);
console.log('[UI] Received response:', response);
```

### Message Inspector

Add to `pluginUtils.ts`:

```typescript
window.addEventListener('message', (event) => {
  console.log('[MESSAGE]', {
    source: event.data.source,
    type: event.data.type,
    messageId: event.data.messageId,
    data: event.data
  });
});
```

### Timeout Issues

If messages timeout:

1. **Check plugin is running**: Refresh Penpot
2. **Check message routing**: Verify `source` fields
3. **Check handler exists**: Look for switch case
4. **Check for errors**: Look in console

### Common Issues

**Issue**: Response never received
- **Cause**: Message ID mismatch
- **Fix**: Ensure plugin uses same messageId in response

**Issue**: "Unknown query type" error
- **Cause**: Handler not added to switch statement
- **Fix**: Add case to plugin router

**Issue**: Timeout errors
- **Cause**: Long-running operation
- **Fix**: Increase timeout: `sendMessageToPlugin(type, payload, 60000)`

## Best Practices

### 1. Always Validate Message Source

```typescript
// ✅ Good
if (message.source !== 'penpotWizardClient') {
  return;
}

// ❌ Bad
// Process any message
```

### 2. Use Unique Message IDs

```typescript
// ✅ Good
const messageId = generateUUID(); // Crypto.randomUUID()

// ❌ Bad
const messageId = Date.now().toString(); // Can collide
```

### 3. Set Appropriate Timeouts

```typescript
// ✅ Good
await sendMessageToPlugin(type, payload, 30000); // 30s for normal ops

// For slow operations:
await sendMessageToPlugin(type, payload, 60000); // 60s

// ❌ Bad
await sendMessageToPlugin(type, payload, 1000); // Too short
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good
try {
  const response = await sendMessageToPlugin(...);
  if (!response.success) {
    throw new Error(response.description);
  }
  return response.data;
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}

// ❌ Bad
return await sendMessageToPlugin(...); // No error handling
```

### 5. Return Structured Responses

```typescript
// ✅ Good
return {
  success: true,
  description: 'User data retrieved',
  data: {
    name: user.name,
    id: user.id
  }
};

// ❌ Bad
return user; // No success flag or description
```

### 6. Clean Up Pending Messages

```typescript
// Handled automatically in pluginUtils.ts
// Timeout clears pending message
// Response clears pending message
```

---

**Next**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and [DEVELOPMENT.md](./DEVELOPMENT.md) for development setup.
