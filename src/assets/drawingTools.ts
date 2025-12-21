import { drawShape, sendMessageToPlugin } from '@/utils/pluginUtils';
import { PenpotShapeType, FunctionTool, ClientQueryType, DrawShapeResponsePayload } from '@/types/types';
import { baseShapeProperties, pathShapeProperties, textShapeProperties, createShapesSchema, createComponentSchema, createBoardSchema, BaseShapeProperties } from '@/types/shapeTypes';

export const drawingTools: FunctionTool[] = [
  {
    id: "rectangle-maker",
    name: "RectangleMakerTool",
    description: `
      Use this tool to draw a rectangle.
      Use parentId to place the rectangle inside a specific board.
      ⚠️ IMPORTANT: If this rectangle is a background, draw it AFTER foreground elements (text, icons).
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.RECTANGLE, shapeProperties);
      return response;
    },
  },   {
    id: 'ellipse-maker',
    name: 'EllipseMakerTool',
    description: `
      Use this tool to draw an ellipse.
      Use parentId to place the ellipse inside a specific board.
      ⚠️ IMPORTANT: If this ellipse is a background, draw it AFTER foreground elements.
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.ELLIPSE, shapeProperties);
      return response;
    },
  },   {
    id: 'path-maker',
    name: 'PathMakerTool',
    description: `
      Use this tool to draw a path. You can draw complex shapes like stars, polygons, curves, etc. using the path tool.
      Define the path with the content property, defining an array of path commands.
      Use parentId to place the path inside a specific board.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - If this path is decorative/foreground: draw it FIRST
      - If this path is background/container: draw it LAST (after all foreground elements)
    `,
    inputSchema: pathShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.PATH, shapeProperties);
      return response;
    },
  },   {
    id: 'text-maker',
    name: 'TextMakerTool',
    description: `
      Use this tool to draw a text.
      Use getProjectData first to see available fonts before creating text.
      Use parentId to place the text inside a specific board.
      
      🚨 TEXT USUALLY GOES ON TOP: Draw text elements BEFORE background shapes!
      Text should typically be drawn FIRST or EARLY in the drawing sequence.
    `,
    inputSchema: textShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.TEXT, shapeProperties);
      return response;
    },
  },   {
    id: 'board-maker',
    name: 'BoardMakerTool',
    description: `
      Use this tool to create a new board.
      Boards are layers that serve as your high-level containers for content organization and layout. 
      Boards are useful if you want to design for a specific screen or print size. Boards can contain other boards. 
      First-level boards act as screens in View mode, acting as screens of a design or pages of a document. 
      Use boards to organize related elements together.
      Also, objects inside boards can be clipped. Boards are a powerful element at Penpot, opening up a ton of 
      possibilities when creating and organizing your designs.
    `,
    inputSchema: baseShapeProperties,
    function: async (shapeProperties) => {
      const response = await drawShape(PenpotShapeType.BOARD, shapeProperties);
      return response;
    },
  },
  {
    id: 'create-shapes',
    name: 'CreateShapesTool',
    description: `
      Use this tool to create one or multiple shapes in a single request. This tool can create rectangles, ellipses, paths, and text shapes.
      
      IMPORTANT: This tool does NOT create boards. Use BoardMakerTool for boards.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array.
    `,
    inputSchema: createShapesSchema,
    function: async (input) => {
      const results = [];
      const orderedShapes = input.shapes.sort((a: BaseShapeProperties, b: BaseShapeProperties) => a.zIndex - b.zIndex);
      
      for (const shape of orderedShapes) {
        const { type, zIndex, ...shapeParams } = shape;
        
        const response = await drawShape(type as PenpotShapeType, shapeParams);
        results.push({
          name: shape.name,
          type: shape.type,
          response,
        });
      }
      
      return results;
    },
  },
  {
    id: 'create-component',
    name: 'CreateComponentTool',
    description: `
      Use this tool to create one or multiple shapes and then convert them into a library component.
      This tool can create rectangles, ellipses, paths, and text shapes, and then creates a component from them.
      
      IMPORTANT: This tool does NOT create boards. Use BoardMakerTool for boards.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array, and then converted into a component with the specified name.
    `,
    inputSchema: createComponentSchema,
    function: async (input) => {
      const createdShapes = [];
      const orderedShapes = input.shapes.sort((a: BaseShapeProperties, b: BaseShapeProperties) => a.zIndex - b.zIndex);
      // Create all shapes first
      for (const shape of orderedShapes) {
        const { type, zIndex, ...shapeParams } = shape;
        
        const response = await drawShape(type as PenpotShapeType, shapeParams);
        
        if (response.success) {
          createdShapes.push((response.payload as DrawShapeResponsePayload)?.shape?.id);
        } else {
          throw new Error(`Failed to create shape: ${response.message}`);
        }
      }
      // Create component from the shapes
      const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
        shapes: createdShapes,
        name: input.name,
      });
        
      return {
        shapes: createdShapes,
        component: componentResponse,
      };
    },
  },
  {
    id: 'create-board',
    name: 'CreateBoardTool',
    description: `
      Use this tool to create a board and then add one or multiple shapes inside it.
      This tool can create rectangles, ellipses, paths, and text shapes inside the board.
      
      The board will be created first, and then all the specified shapes will be added inside it.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The board will be created first, and then all shapes will be created inside it in the order specified in the array.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      // Create the board first
      const boardProperties: BaseShapeProperties = {
        name: input.name || 'Board',
        x: input.x ?? 0,
        y: input.y ?? 0,
        width: input.width ?? 800,
        height: input.height ?? 600,
        borderRadius: 0,
        opacity: 1,
        blendMode: 'normal',
      };
      
      const boardResponse = await drawShape(PenpotShapeType.BOARD, boardProperties);
      console.log('boardResponse', boardResponse);
      if (!boardResponse.success) {
        throw new Error(`Failed to create board: ${boardResponse.message}`);
      }
      
      const boardId = (boardResponse.payload as DrawShapeResponsePayload)?.shape?.id;
      if (!boardId) {
        throw new Error('Failed to get board ID');
      }
      console.log('boardId', boardId);
      // Create all shapes inside the board
      const createdShapes = [];
      const orderedShapes = input.shapes.sort((a: BaseShapeProperties, b: BaseShapeProperties) => b.zIndex - a.zIndex);
      
      for (const shape of orderedShapes) {
        const { type, zIndex, ...shapeParams } = shape;
        
        // Set the board as parent for all shapes
        const shapeWithParent = {
          ...shapeParams,
          parentId: boardId,
        };
        
        const response = await drawShape(type as PenpotShapeType, shapeWithParent);
        console.log('response', response);
        if (response.success) {
          createdShapes.push({
            name: shape.name,
            type: shape.type,
            id: (response.payload as DrawShapeResponsePayload)?.shape?.id,
            response,
          });
        } else {
          throw new Error(`Failed to create shape: ${response.message}`);
        }
      }
      console.log('createdShapes', createdShapes);
      return {
        board: {
          id: boardId,
          name: input.name || 'Board',
          response: boardResponse,
        },
        shapes: createdShapes,
      };
    },
  },
];
