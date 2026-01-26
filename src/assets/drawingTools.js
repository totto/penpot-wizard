import { drawShape, sendMessageToPlugin, createShapesArray } from '@/utils/pluginUtils';
import { ToolResponse } from '@/types/types';
import { PenpotShapeType, ClientQueryType } from '@/types/types';
import { createShapesSchema, createComponentSchema, createComponentFromShapesSchema, createGroupSchema, createBoardSchema, modifyShapePropertiesSchema, modifyTextRangeSchema, rotateShapeSchema, cloneShapeSchema, reorderShapeSchema } from '@/types/shapeTypes';
import { z } from 'zod';

export const drawingTools = [
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
      try {
        const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
        const shapeIds = createdShapes.map(shape => shape.id);
        const { shapes: _, ...componentProperties } = input;
        
        const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
          shapes: shapeIds,
          ...componentProperties,
        });
        
        return componentResponse;
      } catch (error) {
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
    id: 'convert-to-component',
    name: 'ConvertToComponentTool',
    description: `
      Use this tool to convert existing shapes into a new library component.
      Provide a list of shape IDs that you want to convert.

      TIP: Use GET_SELECTED_SHAPES to grab the current selection, then pass the IDs here.
      You can optionally provide a name and component styling properties (fills, strokes, shadows, etc).
    `,
    inputSchema: createComponentFromShapesSchema,
    function: async (input) => {
      try {
        const { shapeIds, ...componentProperties } = input;
        const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
          shapes: shapeIds,
          ...componentProperties,
        });
        return componentResponse;
      } catch (error) {
        if (error.response && error.response.source) {
          return error.response;
        }
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create component from shapes: ${error.message}`,
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
        const createdShapes = await createShapesArray(input.shapes, { throwOnError: true });
        const shapeIds = createdShapes.map(shape => shape.id);
        const { shapes, ...groupProperties } = input;
        
        const groupResponse = await sendMessageToPlugin(ClientQueryType.CREATE_GROUP, {
          shapes: shapeIds,
          ...groupProperties,
        });
        
        return groupResponse;
      } catch (error) {
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
      const { shapes, ...boardProperties } = input;
      const boardResponse = await drawShape(PenpotShapeType.BOARD, { ...boardProperties });

      if (!boardResponse.success) {
        return boardResponse;
      }
      
      const boardId = boardResponse.payload?.shape?.id;
      
      if (!boardId) {
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
        const createdShapes = await createShapesArray(input.shapes, { 
          parentId: boardId, 
          throwOnError: true 
        });

        return {
          ...ToolResponse,
          success: true,
          message: `Board "${input.name || 'Board'}" created successfully with ${createdShapes.length} shape(s)`,
          payload: {
            board: {
              id: boardId,
              name: input.name || 'Board',
              response: boardResponse,
            },
            shapes: createdShapes.map(shape => ({
              name: shape.name,
              type: shape.type,
              id: shape.id,
              response: shape.response,
            })),
          },
        };
      } catch (error) {
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
      Use this tool to modify or removeone or multiple properties of an existing shape.
      
      IMPORTANT: You must provide the shapeId of the shape you want to modify. You can get shape IDs by using GET_CURRENT_PAGE to see all shapes on the current page.
      
      Only provide the properties you want to modify. All properties are optional except shapeId.
      if you provide a property with null value, the actual value of the property will be removed.
    `,
    inputSchema: modifyShapePropertiesSchema,
    function: async (input) => {
      const { shapeId, ...params } = input;
      const response = await sendMessageToPlugin(ClientQueryType.MODIFY_SHAPE, {
        shapeId,
        params,
      });
      return response;
    },
  },
  {
    id: 'modify-text-range',
    name: 'ModifyTextRangeTool',
    description: `
      Use this tool to modify text styling for a specific range inside an existing text shape.
      You must provide the text shapeId, and the start/end indices for the range.
      
      The range is defined using getRange(start, end) on the text shape.
      Provide only the text properties you want to modify in props.
    `,
    inputSchema: modifyTextRangeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.MODIFY_TEXT_RANGE, input);
      return response;
    },
  },
  {
    id: 'rotate-shape',
    name: 'RotateShapeTool',
    description: `
      Use this tool to rotate an existing shape.
      You must provide the shapeId of the shape you want to rotate.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
      
      Provide an angle in degrees. Optionally provide a center point to rotate around;
      omit center or pass null to rotate around the shape's own center.
    `,
    inputSchema: rotateShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.ROTATE_SHAPE, input);
      return response;
    },
  },
  {
    id: 'clone-shape',
    name: 'CloneShapeTool',
    description: `
      Use this tool to clone an existing shape.
      You must provide the shapeId of the shape you want to clone.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
    `,
    inputSchema: cloneShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.CLONE_SHAPE, input);
      return response;
    },
  },
  {
    id: 'bring-to-front-shape',
    name: 'BringToFrontShapeTool',
    description: `
      Use this tool to bring a shape to the front (top of the stacking order).
      You must provide the shapeId of the shape you want to move.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
    `,
    inputSchema: reorderShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.BRING_TO_FRONT_SHAPE, input);
      return response;
    },
  },
  {
    id: 'bring-forward-shape',
    name: 'BringForwardShapeTool',
    description: `
      Use this tool to bring a shape one step forward in the stacking order.
      You must provide the shapeId of the shape you want to move.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
    `,
    inputSchema: reorderShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.BRING_FORWARD_SHAPE, input);
      return response;
    },
  },
  {
    id: 'send-to-back-shape',
    name: 'SendToBackShapeTool',
    description: `
      Use this tool to send a shape to the back (bottom of the stacking order).
      You must provide the shapeId of the shape you want to move.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
    `,
    inputSchema: reorderShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.SEND_TO_BACK_SHAPE, input);
      return response;
    },
  },
  {
    id: 'send-backward-shape',
    name: 'SendBackwardShapeTool',
    description: `
      Use this tool to send a shape one step backward in the stacking order.
      You must provide the shapeId of the shape you want to move.
      You can get shape IDs by using GET_CURRENT_PAGE or GET_SELECTED_SHAPES.
    `,
    inputSchema: reorderShapeSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.SEND_BACKWARD_SHAPE, input);
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
      const response = await sendMessageToPlugin(ClientQueryType.DELETE_SHAPE, input);
      return response;
    },
  },
];
