import { PluginMessageType, ClientQueryType, PenpotShapeType, MessageSourceName, PluginResponsePayload } from '../types/types';
import { Board, Shape, Text } from '@penpot/plugin-types';
import { pathCommandsToSvgString } from './utils';

console.log('AI Agent Chat Plugin loaded successfully!')

// Open the plugin UI with current theme
penpot.ui.open("AI Penpot Wizard", `?theme=${penpot.theme}`, {
  width: 450,
  height: 750,
});

// Listen for theme change events from Penpot
penpot.on('themechange', (newTheme: string) => {
  console.log('Theme changed to:', newTheme);
  
  // Send message to the app about theme change
  penpot.ui.sendMessage({
    type: PluginMessageType.THEME_CHANGE,
    payload: { theme: newTheme },
  });
});

function sendResponseToClient(callId: string, queryType: ClientQueryType, payload: any) {
  penpot.ui.sendMessage({
    source: MessageSourceName.Plugin,
    callId,
    queryType,
    payload,
  });
}

function setParamsToShape(shape: Shape, params: any) {
  const { parentId, color, width, height, ...rest } = params;
  Object.keys(rest).forEach((key) => {
    if (rest[key] !== undefined) {
      (shape as any)[key] = rest[key];
    }
  });
  if (parentId) {
    const parent = penpot.currentPage?.getShapeById(parentId);
    if (parent && parent.type === PenpotShapeType.BOARD) {
      (parent as Board).appendChild(shape);
      shape.parentX = params.x;
      shape.parentY = params.y;
    }
  }
  if (color) {
    shape.fills = [{fillColor: color}] 
  }
  if (width && height) {
    shape.resize(width, height);
  }
}

penpot.ui.onMessage((message: any) => {
  const { type, callId, payload, source } = message;

  if (source !== MessageSourceName.Client) {
    return ;
  }

  const responsePayload: PluginResponsePayload = {
    success: false,
    description: '',
    data: null,
  };

  switch (type) {
    case ClientQueryType.DRAW_SHAPE:
      const { shapeType, params } = payload;

      try {
        let newShape: Shape | Text | null;
        switch (shapeType) {
          case PenpotShapeType.RECTANGLE:
            newShape = penpot.createRectangle();
            break;
          case PenpotShapeType.ELLIPSE:
            newShape = penpot.createEllipse();
            break;
          case PenpotShapeType.PATH:
            newShape = penpot.createPath();
            // params.content debe ser un string SVG
            newShape.content = pathCommandsToSvgString(params.content) as any;
            break;
          case PenpotShapeType.TEXT:
            newShape = penpot.createText(params.characters);
            if (!newShape) {
              throw new Error('Failed to create text shape');
            }
            setParamsToShape(newShape, params);
            break;
          default:
            throw new Error(`Invalid shape type: ${shapeType}`);
        }
        setParamsToShape(newShape, params);
        responsePayload.success = true;
        responsePayload.description = `${shapeType} successfully drawn`;
        responsePayload.data = {
          shapeCreated: newShape,
        };
      } catch (error) {
        responsePayload.success = false;
        responsePayload.description = `${shapeType} unsuccessfully drawn, error: ${error}`;
      }
      break;

    case ClientQueryType.GET_USER_DATA:
      responsePayload.success = true;
      responsePayload.description = 'User data successfully retrieved';
      responsePayload.data = {
        name: penpot.currentUser?.name,
        id: penpot.currentUser?.id,
      };
      break;

    case ClientQueryType.GET_PROJECT_DATA:
      responsePayload.success = true;
      responsePayload.description = 'Project data successfully retrieved';
      responsePayload.data = {
        project: {
          name: penpot.currentFile?.name,
          id: penpot.currentFile?.id,
          pages: penpot.currentFile?.pages.map((page) => ({
            name: page.name,
            id: page.id,
          })),
        },
        availableFonts: penpot.fonts.all.map((font) => ({
          name: font.name,
          fontId: font.fontId,
          fontFamily: font.fontFamily,
        })),
        currentPage: {
          name: penpot.currentPage?.name,
          id: penpot.currentPage?.id,
          shapes: penpot.currentPage?.findShapes({}),
        },
      };
      break;
  }

  sendResponseToClient(callId, type, responsePayload);
});
