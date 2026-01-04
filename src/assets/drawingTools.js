import { drawShape, sendMessageToPlugin, modifyShape, deleteShape, createShapesArray, curateShapeResponse } from '@/utils/pluginUtils';
import { PenpotShapeType, ClientQueryType } from '@/types/types';
import { baseShapeProperties, pathShapeProperties, textShapeProperties, createShapesSchema, createComponentSchema, createGroupSchema, createBoardSchema, modifyShapePropertiesSchema } from '@/types/shapeTypes';
import { z } from 'zod';

export const drawingTools = [
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
      Use this tool to draw a text element.
      
      REQUIRED STEP: Always use getAvailableFonts BEFORE creating text to verify which fonts are available.
      You must check available fonts before using this tool.
      
      Use parentId to place the text inside a specific board.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      Text should typically be drawn FIRST or EARLY in the drawing sequence (before background shapes).
      Text elements usually go on top of other elements.
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
      
      REQUIRED STEP: If creating text shapes, always use getAvailableFonts BEFORE using this tool to verify which fonts are available.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array.
      Use parentId in shape properties to place shapes inside a specific board.
    `,
    inputSchema: createShapesSchema,
    function: async (input) => {
      const createdShapes = await createShapesArray(input.shapes, { throwOnError: false });
      
      return createdShapes.map(shape => ({
        name: shape.name,
        type: shape.type,
        response: shape.response,
      }));
    },
  },
  {
    id: 'create-component',
    name: 'CreateComponentTool',
    description: `
      Use this tool to create one or multiple shapes and then convert them into a library component.
      This tool can create rectangles, ellipses, paths, and text shapes, and then creates a component from them.
      
      IMPORTANT: This tool does NOT create boards. Use BoardMakerTool for boards.
      
      🎨 KEY CONCEPT: The component itself IS a shape! You don't need to create a background shape.
      - You can apply fills, strokes, and shadows directly to the component using the component properties
      - These visual properties (fills, strokes, shadows) will be applied to the component's background
      - The component acts as a container with its own visual styling
      
      REQUIRED STEP: If creating text shapes, always use getAvailableFonts BEFORE using this tool to verify which fonts are available.
      
      🚨 CRITICAL STACKING ORDER: Use zIndex to control stacking order of shapes within the component!
      - Text and foreground elements should have a higher zIndex than backgrounds
      - Shapes are created in the order specified, but zIndex determines visual stacking
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array, and then converted into a component with the specified name.
      Use parentId in shape properties to place shapes inside a specific board before converting to component.
    `,
    inputSchema: createComponentSchema,
    function: async (input) => {
      // Create all shapes first
      const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
      
      // Extract shape IDs for component creation
      const shapeIds = createdShapes.map(shape => shape.id);
      
      // Extract component properties (all properties except shapes)
      const { shapes: _, ...componentProperties } = input;
      
      // Create component from the shapes
      const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
        shapes: shapeIds,
        ...componentProperties,
      });
        
      return {
        shapes: shapeIds,
        component: componentResponse,
      };
    },
  },
  {
    id: 'create-group',
    name: 'CreateGroupTool',
    description: `
      Use this tool to create one or multiple shapes and then group them together.
      This tool can create rectangles, ellipses, paths, and text shapes, and then creates a group from them.
      
      IMPORTANT: This tool does NOT create boards. Use BoardMakerTool for boards.
      
      🎨 KEY CONCEPT: Groups are NOT shapes! They are containers that only have position (x, y) and size (width, height).
      - Groups do NOT support fills, strokes, or shadows directly
      - If you need a background for the group, you MUST create a background shape (rectangle, ellipse, or path) with zIndex: 0
      - The background shape should be included in the shapes array and will be part of the group
      - Position and size properties apply to the group container itself
      
      REQUIRED STEP: If creating text shapes, always use getAvailableFonts BEFORE using this tool to verify which fonts are available.
      
      🚨 CRITICAL STACKING ORDER: Use zIndex to control stacking order of shapes within the group!
      - Background shapes should have zIndex: 0 (lowest, appears at the back)
      - Text and foreground elements should have a higher zIndex than backgrounds
      - Shapes are created in the order specified, but zIndex determines visual stacking
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array, and then grouped together with the specified name (if provided).
      Use parentId in shape properties to place shapes inside a specific board before grouping.
    `,
    inputSchema: createGroupSchema,
    function: async (input) => {
      // Create all shapes first
      const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
      
      // Extract shape IDs for group creation
      const shapeIds = createdShapes.map(shape => shape.id);
      
      // Extract group properties (all properties except shapes)
      const { shapes: _, ...groupProperties } = input;
      
      // Create group from the shapes
      const groupResponse = await sendMessageToPlugin(ClientQueryType.CREATE_GROUP, {
        shapes: shapeIds,
        ...groupProperties,
      });
        
      return {
        shapes: createdShapes.map(shape => ({
          name: shape.name,
          type: shape.type,
          id: shape.id,
          response: shape.response, // Already curated by createShapesArray -> drawShape
        })),
        group: curateShapeResponse(groupResponse), // Curate the group response
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
      
      REQUIRED STEP: If creating text shapes, always use getAvailableFonts BEFORE using this tool to verify which fonts are available.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The board will be created first, and then all shapes will be created inside it in the order specified in the array.
      The board properties (name, x, y, width, height, borderRadius, fills, strokes) are optional and will use defaults if not provided.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      // Create the board first
      const boardProperties = {
        name: input.name || 'Board',
        x: input.x ?? 0,
        y: input.y ?? 0,
        width: input.width ?? 800,
        height: input.height ?? 600,
        borderRadius: 0,
        opacity: 1,
        blendMode: 'normal',
        zIndex: 0,
      };
      
      const boardResponse = await drawShape(PenpotShapeType.BOARD, boardProperties);

      if (!boardResponse.success) {
        throw new Error(`Failed to create board: ${boardResponse.message}`);
      }
      
      const boardId = boardResponse.payload?.shape?.id;
      if (!boardId) {
        throw new Error('Failed to get board ID');
      }
      
      // Create all shapes inside the board
      const createdShapes = await createShapesArray(input.shapes, { 
        parentId: boardId, 
        throwOnError: true 
      });

      return {
        board: {
          id: boardId,
          name: input.name || 'Board',
          response: boardResponse, // Already curated by drawShape
        },
        shapes: createdShapes.map(shape => ({
          name: shape.name,
          type: shape.type,
          id: shape.id,
          response: shape.response, // Already curated by createShapesArray -> drawShape
        })),
      };
    },
  },
  {
    id: 'modify-shape',
    name: 'ModifyShapeTool',
    description: `
      Use this tool to modify one or multiple properties of an existing shape.
      You can modify properties like position (x, y), size (width, height), colors, fills, strokes, shadows, opacity, blend mode, border radius, and more.
      
      For text shapes, you can also modify text-specific properties like characters, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform, textDecoration, direction, align, and verticalAlign.
      
      For path shapes, you can also modify the path content.
      
      IMPORTANT: You must provide the shapeId of the shape you want to modify. You can get shape IDs by using GET_CURRENT_PAGE to see all shapes on the current page.
      
      Only provide the properties you want to modify. All properties are optional except shapeId.
    `,
    inputSchema: modifyShapePropertiesSchema,
    function: async (input) => {
      const { shapeId, ...params } = input;
      const response = await modifyShape(shapeId, params);
      return response;
    },
  },
  {
    id: 'delete-shape',
    name: 'DeleteShapeTool',
    description: `
      Use this tool to delete a shape from the current page.
      You must provide the shapeId of the shape you want to delete.
      You can get shape IDs by using GET_CURRENT_PAGE to see all shapes on the current page.
      
      IMPORTANT: This action cannot be undone. Make sure you want to delete the shape before using this tool.
    `,
    inputSchema: z.object({
      shapeId: z.string().describe('The ID of the shape to delete'),
    }),
    function: async (input) => {
      const response = await deleteShape(input.shapeId);
      return response;
    },
  },
];

