import { drawShape, sendMessageToPlugin, modifyShape, deleteShape, createShapesArray } from '@/utils/pluginUtils';
import { ToolResponse } from '@/types/types';
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
      
      REQUIRED STEP: Use design-styles-rag to decide fonts, colors, and other design tokens before creating text.
      
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
  },
  {
    id: 'create-shapes',
    name: 'CreateShapesTool',
    description: `
      Use this tool to create one or multiple shapes in a single request. This tool can create rectangles, ellipses, paths, and text shapes.
      
      IMPORTANT: This tool does NOT create boards. Use CreateBoardTool for boards.
      
      REQUIRED STEP: If creating text shapes, use design-styles-rag to decide fonts, colors, and other design tokens.
      
      🚨 CRITICAL STACKING ORDER: New shapes appear BELOW existing shapes!
      - Text and foreground elements should be created FIRST (at the beginning of the shapes array)
      - Backgrounds and containers should be created LAST (at the end of the shapes array)
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array.
      Use parentId in shape properties to place shapes inside a specific board.
    `,
    inputSchema: createShapesSchema,
    function: async (input) => {
      try {
        const createdShapes = await createShapesArray(input.shapes, { throwOnError: false });
        
        // Check if any shapes failed to create
        const failedShapes = createdShapes.filter(shape => !shape.response?.success);
        const successCount = createdShapes.length - failedShapes.length;
        
        if (failedShapes.length > 0) {
          return {
            ...ToolResponse,
            success: false,
            message: `Partially successful: ${successCount} shape(s) created, ${failedShapes.length} failed`,
            payload: { 
              shapes: createdShapes.map(shape => ({
                name: shape.name,
                type: shape.type,
                id: shape.id,
                response: shape.response,
              })),
              failedCount: failedShapes.length,
            },
          };
        }
        
        return {
          ...ToolResponse,
          success: true,
          message: `Successfully created ${createdShapes.length} shape(s)`,
          payload: { 
            shapes: createdShapes.map(shape => ({
              name: shape.name,
              type: shape.type,
              id: shape.id,
              response: shape.response,
            }))
          },
        };
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create shapes: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'create-component',
    name: 'CreateComponentTool',
    description: `
      Use this tool to create one or multiple shapes and then convert them into a library component.
      This tool can create rectangles, ellipses, paths, and text shapes, and then creates a component from them.
      
      IMPORTANT: This tool does NOT create boards. Use CreateBoardTool for boards.
      
      🎨 KEY CONCEPT: The component itself IS a shape! You don't need to create a background shape.
      - You can apply fills, strokes, and shadows directly to the component using the component properties
      - These visual properties (fills, strokes, shadows) will be applied to the component's background
      - The component acts as a container with its own visual styling
      
      REQUIRED STEP: If creating text shapes, use design-styles-rag to decide fonts, colors, and other design tokens.
      
      🚨 CRITICAL STACKING ORDER: Use zIndex to control stacking order of shapes within the component!
      - Text and foreground elements should have a higher zIndex than backgrounds
      - Shapes are created in the order specified, but zIndex determines visual stacking
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array, and then converted into a component with the specified name.
      Use parentId in shape properties to place shapes inside a specific board before converting to component.
    `,
    inputSchema: createComponentSchema,
    function: async (input) => {
      console.log('createComponent -> input.shapes:', input.shapes);
      try {
        // Create all shapes first
        const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
        console.log('createComponent -> createdShapes:', createdShapes);
        // Extract shape IDs for component creation
        const shapeIds = createdShapes.map(shape => shape.id);
        console.log('createComponent -> shapeIds:', shapeIds);
        // Extract component properties (all properties except shapes)
        const { shapes: _, ...componentProperties } = input;
        
        // Create component from the shapes
        const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
          shapes: shapeIds,
          ...componentProperties,
        });
        
        // Return the response directly - it's already formatted
        return componentResponse;
      } catch (error) {
        // If error comes from createShapesArray, it might be a formatted response
        // Otherwise, format a new error response
        if (error.response && error.response.source) {
          return error.response;
        }
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create component: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'create-group',
    name: 'CreateGroupTool',
    description: `
      Use this tool to create one or multiple shapes and then group them together.
      This tool can create rectangles, ellipses, paths, and text shapes, and then creates a group from them.
      
      IMPORTANT: This tool does NOT create boards. Use CreateBoardTool for boards.
      
      🎨 KEY CONCEPT: Groups are NOT shapes! They are containers that only have position (x, y) and size (width, height).
      - Groups do NOT support fills, strokes, or shadows directly
      - If you need a background for the group, you MUST create a background shape (rectangle, ellipse, or path) with zIndex: 0
      - The background shape should be included in the shapes array and will be part of the group
      - Position and size properties apply to the group container itself
      
      REQUIRED STEP: If creating text shapes, use design-styles-rag to decide fonts, colors, and other design tokens.
      
      🚨 CRITICAL STACKING ORDER: Use zIndex to control stacking order of shapes within the group!
      - Background shapes should have zIndex: 0 (lowest, appears at the back)
      - Text and foreground elements should have a higher zIndex than backgrounds
      - Shapes are created in the order specified, but zIndex determines visual stacking
      
      You can create multiple shapes efficiently in one call. The shapes will be created in the order specified in the array, and then grouped together with the specified name (if provided).
      Use parentId in shape properties to place shapes inside a specific board before grouping.
    `,
    inputSchema: createGroupSchema,
    function: async (input) => {
      try {
        // Create all shapes first
        const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
        
        // Extract shape IDs for group creation
        const shapeIds = createdShapes.map(shape => shape.id);
        
        // Extract group properties (all properties except shapes)
        const { shapes, ...groupProperties } = input;
        
        // Create group from the shapes
        const groupResponse = await sendMessageToPlugin(ClientQueryType.CREATE_GROUP, {
          shapes: shapeIds,
          ...groupProperties,
        });
        
        // Return the response directly - it's already formatted
        return groupResponse;
      } catch (error) {
        // If error comes from createShapesArray, it might be a formatted response
        // Otherwise, format a new error response
        if (error.response && error.response.source) {
          return error.response;
        }
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create group: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'create-board',
    name: 'CreateBoardTool',
    description: `
      Use this tool to create a board and then add one or multiple shapes inside it.      
      The board will be created first, and then all the specified shapes will be added inside it.
      
      ✅ PRIORITIZE LAYOUTS (FLEX / GRID)
      - Prefer configuring the board with "flex" or "grid" to control structure and spacing.
      - For flex layouts, define child positioning with "layoutChild" (alignSelf, sizing, margins).
      - For grid layouts, define child placement with "layoutCell" (row/column/rowSpan/columnSpan/areaName/position) and sizing/alignment with "layoutChild".
      - Use x/y only when you explicitly set layoutChild.absolute = true for absolute positioning.
      - Layout-driven boards keep spacing consistent and make responsive adjustments easier.
      
      REQUIRED STEP: Before creating shapes, use design-styles-rag to decide layout, fonts, colors, and other design tokens.
      
      You can create multiple shapes efficiently in one call. The board will be created first, and then all shapes will be created inside it in the order specified with the zIndex property.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      console.log('createBoard -> input:', input);
      // Create the board first
      const { shapes, ...boardProperties } = input;
      const boardResponse = await drawShape(PenpotShapeType.BOARD, { ...boardProperties });
      console.log('createBoard -> boardResponse:', boardResponse);
      // If board creation failed, return the error response directly
      if (!boardResponse.success) {
        return boardResponse;
      }
      
      const boardId = boardResponse.payload?.shape?.id;
      if (!boardId) {
        // Create error response for missing board ID
        return {
          ...ToolResponse,
          success: false,
          message: 'Failed to get board ID from response',
          payload: {
            board: {
              response: boardResponse,
            },
            shapes: [],
            error: 'Failed to get board ID from response',
          },
        };
      }
      
      try {
        // Create all shapes inside the board
        const createdShapes = await createShapesArray(input.shapes, { 
          parentId: boardId, 
          throwOnError: true 
        });

        // Create a combined response with board and shapes info
        return {
          ...ToolResponse,
          success: true,
          message: `Board "${input.name || 'Board'}" created successfully with ${createdShapes.length} shape(s)`,
          payload: {
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
          },
        };
      } catch (error) {
        // If error comes from createShapesArray, it might be a formatted response
        // Otherwise, format a new error response
        if (error.response && error.response.source) {
          return error.response;
        }
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create shapes in board: ${error.message}`,
          payload: {
            board: {
              id: boardId,
              name: input.name || 'Board',
              response: boardResponse,
            },
            shapes: [],
            error: error.message,
          },
        };
      }
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

