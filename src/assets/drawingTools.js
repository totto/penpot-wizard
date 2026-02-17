import { sendMessageToPlugin, createShapesArray } from '@/utils/pluginUtils';
import { ToolResponse, ClientQueryType } from '@/types/types';
import { createShapesSchema, createComponentSchema, createGroupSchema, createBoardSchema, convertGroupToBoardSchema, modifyBoardSchema, modifyComponentSchema, modifyShapePropertiesSchema, modifyTextRangeSchema, rotateShapeSchema, cloneShapeSchema, reorderShapeSchema } from '@/types/shapeTypes';
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
      Use the optional parent property to place shapes inside a board, group, or component.
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
      Use this tool to convert existing shapes into a library component.
      
      ⚠️ PREREQUISITE: You must first create shapes using CreateShapesTool, then pass their IDs to this tool.
      
      This tool can group any existing shapes (rectangles, ellipses, paths, text, groups, components, or boards) into a component.
      
      🎨 KEY CONCEPT: The component itself IS a shape! You don't need to create a background shape.
      - You can apply fills, strokes, and shadows directly to the component using the component properties
      - These visual properties (fills, strokes, shadows) will be applied to the component's background
      - The component acts as a container with its own visual styling
      
      📋 WORKFLOW:
      1. Create the shapes you need using CreateShapesTool (get the shape IDs from the response)
      2. Call this tool with the shapeIds array (objects with shapeId and optional zIndex) to convert them into a component
      
      TIP: You can also use GET_SELECTED_SHAPES to grab existing shapes, then pass their IDs here.
    `,
    inputSchema: createComponentSchema,
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
      Use this tool to create a group from existing shapes, new shapes, or both.
      
      Groups support all ShapeBase properties (fills, strokes, shadows, blur, etc).
      
      You can provide:
      - shapeIds: existing shapes to group (objects with shapeId and optional zIndex)
      - shapes: new shapes to create and include in the group
      
      If both are provided, all shapes will be grouped together.
      To add content later, create new items with CreateShapesTool, CreateGroupTool, CreateComponentTool, or CreateBoardTool
      and pass the group's id as the parentId of those new items.
    `,
    inputSchema: createGroupSchema,
    function: async (input) => {
      try {
        const { shapes, shapeIds, ...groupProperties } = input;
        const createdShapes = shapes?.length
          ? await createShapesArray(shapes, { throwOnError: false })
          : [];

        const createdEntries = createdShapes
          .map((shape, index) => ({
            shapeId: shape.id,
            zIndex: shapes?.[index]?.zIndex,
            created: true,
            meta: shape,
          }))
          .filter(entry => Boolean(entry.shapeId));

        const providedEntries = Array.isArray(shapeIds)
          ? shapeIds.map((shapeRef) => (
            typeof shapeRef === 'string'
              ? { shapeId: shapeRef, zIndex: undefined, created: false }
              : {
                shapeId: shapeRef.shapeId,
                zIndex: shapeRef.zIndex,
                created: false,
              }
          ))
          : [];

        const combinedEntries = [...createdEntries, ...providedEntries]
          .filter(entry => Boolean(entry.shapeId));

        const hasShapesToGroup = combinedEntries.length > 0;
        if (!hasShapesToGroup) {
          return {
            ...ToolResponse,
            success: false,
            message: 'Failed to create group: no shapes provided or created',
            payload: { error: 'Provide shapeIds and/or shapes to create a group' },
          };
        }

        const sortedShapeIds = [...combinedEntries]
          .sort((a, b) => {
            if (typeof a.zIndex === 'number' && typeof b.zIndex === 'number') {
              return b.zIndex - a.zIndex;
            }
            if (typeof a.zIndex === 'number') {
              return -1;
            }
            if (typeof b.zIndex === 'number') {
              return 1;
            }
            return 0;
          })
          .map(entry => entry.shapeId);

        const groupResponse = await sendMessageToPlugin(ClientQueryType.CREATE_GROUP, {
          shapeIds: sortedShapeIds,
          ...groupProperties,
        });

        if (!groupResponse?.success) {
          const errorMessage = groupResponse?.message || 'Failed to create group';
          const errorDetail = groupResponse?.payload?.error || 'Unknown error while creating group';
          return {
            ...ToolResponse,
            success: false,
            message: errorMessage,
            payload: { error: errorDetail },
          };
        }

        const groupId = groupResponse.payload?.group?.id;
        if (!groupId) {
          return {
            ...ToolResponse,
            success: false,
            message: 'Group created but no group id returned to add shapes',
            payload: { error: 'Missing group id in create-group response' },
          };
        }

        const totalCreatedCount = shapes?.length ?? 0;
        const failedCount = totalCreatedCount - createdShapes.length;
        if (failedCount > 0) {
          return {
            ...ToolResponse,
            success: false,
            message: `Partially successful: group created, ${createdShapes.length} shape(s) created, ${failedCount} failed`,
            payload: {
              group: groupResponse.payload?.group,
              shapes: createdShapes.map(shape => ({
                name: shape.name,
                type: shape.type,
                id: shape.id,
                response: shape.response,
              })),
              failedCount,
            },
          };
        }

        return {
          ...ToolResponse,
          success: true,
          message: `Group created successfully`,
          payload: {
            group: groupResponse.payload?.group,
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
      Use this tool to create a board and optionally move existing shapes inside it.
      
      ⚠️ PREREQUISITE: If you want to move shapes into the board, first create them using CreateShapesTool, then pass their IDs to this tool.
      
      This tool creates a board and moves the specified shapes inside it. The shapes can be rectangles, ellipses, paths, text, groups, components, or other boards.
      
      ✅ PRIORITIZE LAYOUTS (FLEX / GRID)
      - Prefer configuring the board with "flex" or "grid" to control structure and spacing.
      - For flex layouts, define child positioning with "layoutChild" (alignSelf, sizing, margins).
      - For grid layouts, define child placement with "layoutCell" (row/column/rowSpan/columnSpan/areaName/position) and sizing/alignment with "layoutChild".
      - Use x/y only when you explicitly set layoutChild.absolute = true for absolute positioning.
      - Layout-driven boards keep spacing consistent and make responsive adjustments easier.
      
      📋 WORKFLOW:
      1. Create the shapes you need using CreateShapesTool (get the shape IDs from the response)
      2. Call this tool with the shapeIds array (objects with shapeId and optional zIndex) to create a board containing them
      
      TIP: You can also use GET_SELECTED_SHAPES to grab existing shapes, then pass their IDs here.
      This allows creating a board from existing shapes without creating new ones first.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      try {
        const { shapeIds, ...boardProperties } = input;
        
        const boardResponse = await sendMessageToPlugin(ClientQueryType.CREATE_BOARD, {
          shapes: shapeIds,
          ...boardProperties,
        });
        
        return boardResponse;
      } catch (error) {
        if (error.response && error.response.source) {
          return error.response;
        }
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create board: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'convert-group-to-board',
    name: 'ConvertGroupToBoardTool',
    description: `
      Use this tool to convert an existing group into a board while preserving its children.
      
      You must provide the groupId of the group you want to convert.
      You can optionally pass board properties to apply after conversion (e.g., name, fills, layout).
      
      TIP: Use GET_SELECTED_SHAPES or GET_CURRENT_PAGE to find the group ID.
    `,
    inputSchema: convertGroupToBoardSchema,
    function: async (input) => {
      try {
        const { groupId, properties } = input;
        const response = await sendMessageToPlugin(ClientQueryType.CONVERT_GROUP_TO_BOARD, {
          groupId,
          properties,
        });
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to convert group to board: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'modify-board',
    name: 'ModifyBoardTool',
    description: `
      Use this tool to modify one or more properties of an existing board.
      
      IMPORTANT: You must provide the boardId of the board you want to modify.
      Only provide the properties you want to modify. Use null to remove a property.
    `,
    inputSchema: modifyBoardSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.MODIFY_BOARD, input);
      return response;
    },
  },
  {
    id: 'modify-component',
    name: 'ModifyComponentTool',
    description: `
      Use this tool to modify one or more properties of an existing component.
      
      IMPORTANT: You must provide the componentId (library component id or component instance id).
      Only provide the properties you want to modify. Use null to remove a property.
      
      TIP: Use GET_CURRENT_PAGE to list available components from the local library.
    `,
    inputSchema: modifyComponentSchema,
    function: async (input) => {
      const response = await sendMessageToPlugin(ClientQueryType.MODIFY_COMPONENT, input);
      return response;
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
      Use this tool to create a copy of an existing shape or create a instance of a component
      If you want to create a instance of a component, you must provide the shapeId of the main shape of the component.
      If you want to create a copy of a shape, you must provide the shapeId of the shape you want to clone.
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
