import { sendMessageToPlugin, createShapesArray } from '@/utils/pluginUtils';
import { ToolResponse, ClientQueryType } from '@/types/types';
import { createShapesSchema, createComponentSchema, createGroupSchema, createBoardSchema, convertGroupToBoardSchema, convertGroupToComponentSchema, convertBoardToComponentSchema, createBooleanSchema, ungroupShapeSchema, alignShapesSchema, distributeShapesSchema, addNavigateToInteractionSchema, addCloseOverlayInteractionSchema, addPreviousScreenInteractionSchema, addOpenUrlInteractionSchema, createFlowSchema, removeFlowSchema, modifyBoardSchema, modifyComponentSchema, modifyShapePropertiesSchema, modifyTextRangeSchema, rotateShapeSchema, cloneShapeSchema, reorderShapeSchema } from '@/types/shapeTypes';
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
      Use this tool to create a library component from existing shapes, new shapes, or both.
      
      You can provide:
      - shapeIds: existing shapes to include (objects with shapeId and optional zIndex). Can include groups, components, boards.
      - shapes: new shapes to create and include (rectangles, ellipses, paths, text)
      
      If both are provided, all shapes will be included in the component.
      
      🎨 KEY CONCEPT: The component itself IS a shape! You don't need to create a background shape.
      - You can apply fills, strokes, and shadows directly to the component using the component properties
      - These visual properties (fills, strokes, shadows) will be applied to the component's background
      
      TIP: Use GET_SELECTED_SHAPES to grab existing shapes, then pass their IDs here.
    `,
    inputSchema: createComponentSchema,
    function: async (input) => {
      try {
        const { shapes, shapeIds, ...componentProperties } = input;
        const createdShapes = shapes?.length
          ? await createShapesArray(shapes, { throwOnError: false })
          : [];

        const createdEntries = createdShapes
          .map((shape, index) => ({
            shapeId: shape.id,
            zIndex: shapes?.[index]?.zIndex,
          }))
          .filter(entry => Boolean(entry.shapeId));

        const providedEntries = Array.isArray(shapeIds)
          ? shapeIds.map((shapeRef) => (
            typeof shapeRef === 'string'
              ? { shapeId: shapeRef, zIndex: undefined }
              : { shapeId: shapeRef.shapeId, zIndex: shapeRef.zIndex }
          ))
          : [];

        const combinedEntries = [...createdEntries, ...providedEntries]
          .filter(entry => Boolean(entry.shapeId))
          .sort((a, b) => {
            if (typeof a.zIndex === 'number' && typeof b.zIndex === 'number') {
              return (a.zIndex ?? 0) - (b.zIndex ?? 0);
            }
            if (typeof a.zIndex === 'number') return -1;
            if (typeof b.zIndex === 'number') return 1;
            return 0;
          });

        const componentResponse = await sendMessageToPlugin(ClientQueryType.CREATE_COMPONENT, {
          shapes: combinedEntries,
          ...componentProperties,
        });

        if (!componentResponse?.success && createdShapes.length > 0) {
          const failedCount = shapes?.length ? shapes.length - createdShapes.filter(s => s.id).length : 0;
          if (failedCount > 0) {
            return {
              ...ToolResponse,
              success: false,
              message: `Partially failed: ${createdShapes.filter(s => s.id).length} shape(s) created, ${failedCount} failed. ${componentResponse?.message || ''}`,
              payload: { ...componentResponse?.payload, createdShapes, failedCount },
            };
          }
        }

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
      Use this tool to create a board with existing shapes, new shapes, or both.
      
      You can provide:
      - shapeIds: existing shapes to move into the board (objects with shapeId and optional zIndex). Can include groups, components, other boards.
      - shapes: new shapes to create and include (rectangles, ellipses, paths, text)
      
      If both are provided, all shapes will be placed inside the board. You can create a complete board with content in a single call.
      
      ✅ PRIORITIZE LAYOUTS (FLEX / GRID)
      - Prefer configuring the board with "flex" or "grid" to control structure and spacing.
      - For flex layouts, define child positioning with "layoutChild" (alignSelf, sizing, margins).
      - For grid layouts, define child placement with "layoutCell" (row/column/rowSpan/columnSpan) and sizing/alignment with "layoutChild".
      - Use x/y only when you explicitly set layoutChild.absolute = true for absolute positioning.
      
      TIP: Use GET_SELECTED_SHAPES to grab existing shapes, then pass their IDs here.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      try {
        const { shapes, shapeIds, ...boardProperties } = input;
        const createdShapes = shapes?.length
          ? await createShapesArray(shapes, { throwOnError: false })
          : [];

        const createdEntries = createdShapes
          .map((shape, index) => ({
            shapeId: shape.id,
            zIndex: shapes?.[index]?.zIndex,
          }))
          .filter(entry => Boolean(entry.shapeId));

        const providedEntries = Array.isArray(shapeIds)
          ? shapeIds.map((shapeRef) => (
            typeof shapeRef === 'string'
              ? { shapeId: shapeRef, zIndex: undefined }
              : { shapeId: shapeRef.shapeId, zIndex: shapeRef.zIndex }
          ))
          : [];

        const combinedEntries = [...createdEntries, ...providedEntries]
          .filter(entry => Boolean(entry.shapeId))
          .sort((a, b) => {
            if (typeof a.zIndex === 'number' && typeof b.zIndex === 'number') {
              return (a.zIndex ?? 0) - (b.zIndex ?? 0);
            }
            if (typeof a.zIndex === 'number') return -1;
            if (typeof b.zIndex === 'number') return 1;
            return 0;
          });

        const boardResponse = await sendMessageToPlugin(ClientQueryType.CREATE_BOARD, {
          shapes: combinedEntries,
          ...boardProperties,
        });

        if (!boardResponse?.success && createdShapes.length > 0) {
          const failedCount = shapes?.length ? shapes.length - createdShapes.filter(s => s.id).length : 0;
          if (failedCount > 0) {
            return {
              ...ToolResponse,
              success: false,
              message: `Partially failed: ${createdShapes.filter(s => s.id).length} shape(s) created, ${failedCount} failed. ${boardResponse?.message || ''}`,
              payload: { ...boardResponse?.payload, createdShapes, failedCount },
            };
          }
        }

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
    id: 'convert-group-to-component',
    name: 'ConvertGroupToComponentTool',
    description: `
      Use this tool to convert an existing group into a library component while preserving its children.
      The group is replaced by a component instance at the same position.
      
      You must provide the groupId of the group you want to convert.
      You can optionally pass a name and component properties (fills, strokes, layout, etc.) to apply after conversion.
      
      TIP: Use GET_SELECTED_SHAPES or GET_CURRENT_PAGE to find the group ID.
    `,
    inputSchema: convertGroupToComponentSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.CONVERT_GROUP_TO_COMPONENT, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to convert group to component: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'convert-board-to-component',
    name: 'ConvertBoardToComponentTool',
    description: `
      Use this tool to convert an existing board into a library component while preserving its children.
      The board is replaced by a component instance at the same position.
      
      You must provide the boardId of the board you want to convert.
      You can optionally pass a name and component properties (fills, strokes, layout, etc.) to apply after conversion.
      
      TIP: Use GET_SELECTED_SHAPES or GET_CURRENT_PAGE to find the board ID.
    `,
    inputSchema: convertBoardToComponentSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.CONVERT_BOARD_TO_COMPONENT, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to convert board to component: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'create-boolean',
    name: 'CreateBooleanTool',
    description: `
      Use this tool to create a boolean shape from two or more existing shapes.
      Boolean operations combine shapes: union (merge), difference (cut out), exclude (xor), intersection (keep overlap).
      
      You must provide the boolType and at least 2 shape IDs.
      Use GET_CURRENT_PAGE or GET_SELECTED_SHAPES to get shape IDs.
      
      Operations: union (combine into one), difference (first minus others), exclude (xor), intersection (only overlapping area).
    `,
    inputSchema: createBooleanSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.CREATE_BOOLEAN, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create boolean shape: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'ungroup-shape',
    name: 'UngroupShapeTool',
    description: `
      Use this tool to ungroup a group. The children shapes will be moved to the parent of the group.
      
      You must provide the groupId of the group to ungroup.
      Only works on groups, not on boards or components.
      
      TIP: Use GET_CURRENT_PAGE or GET_SELECTED_SHAPES to find the group ID.
    `,
    inputSchema: ungroupShapeSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.UNGROUP_SHAPE, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to ungroup: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'align-shapes',
    name: 'AlignShapesTool',
    description: `
      Use this tool to align two or more shapes along an axis.
      
      Provide shapeIds (at least 2), axis (horizontal or vertical), and direction:
      - Horizontal: left, center, right
      - Vertical: top, center, bottom
      
      TIP: Use GET_CURRENT_PAGE or GET_SELECTED_SHAPES to get shape IDs.
    `,
    inputSchema: alignShapesSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.ALIGN_SHAPES, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to align shapes: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'distribute-shapes',
    name: 'DistributeShapesTool',
    description: `
      Use this tool to distribute shapes with equal spacing along an axis.
      
      Provide shapeIds (at least 2) and axis (horizontal or vertical).
      Shapes will be spaced evenly between the leftmost/rightmost or top/bottom shapes.
      
      TIP: Use GET_CURRENT_PAGE or GET_SELECTED_SHAPES to get shape IDs.
    `,
    inputSchema: distributeShapesSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.DISTRIBUTE_SHAPES, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to distribute shapes: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'add-navigate-to-interaction',
    name: 'AddNavigateToInteractionTool',
    description: `
      Add a navigate-to interaction to a shape (e.g. button). When triggered, goes to another board.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
      Use GET_CURRENT_PAGE to get board IDs.
    `,
    inputSchema: addNavigateToInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay, destinationBoardId, preserveScrollPosition, animation } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'navigate-to', destinationBoardId, preserveScrollPosition, animation } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
  {
    id: 'add-close-overlay-interaction',
    name: 'AddCloseOverlayInteractionTool',
    description: `
      Add a close-overlay interaction to a shape. Closes the current or specified overlay.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
    `,
    inputSchema: addCloseOverlayInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay, destinationBoardId, animation } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'close-overlay', destinationBoardId, animation } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
  {
    id: 'add-previous-screen-interaction',
    name: 'AddPreviousScreenInteractionTool',
    description: `
      Add a previous-screen interaction to a shape. Goes back to the previous screen in the flow.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
    `,
    inputSchema: addPreviousScreenInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'previous-screen' } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
  {
    id: 'add-open-url-interaction',
    name: 'AddOpenUrlInteractionTool',
    description: `
      Add an open-url interaction to a shape. Opens a URL in a new browser tab.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
    `,
    inputSchema: addOpenUrlInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay, url } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'open-url', url } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
  {
    id: 'create-flow',
    name: 'CreateFlowTool',
    description: `
      Use this tool to create a prototype flow. A flow defines a starting point for user journeys.
      
      Provide a name (e.g. "Onboarding") and the boardId of the starting board.
      Use GET_CURRENT_PAGE to get board IDs. Flows are listed in the page payload.
    `,
    inputSchema: createFlowSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.CREATE_FLOW, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to create flow: ${error.message}`,
          payload: { error: error.message },
        };
      }
    },
  },
  {
    id: 'remove-flow',
    name: 'RemoveFlowTool',
    description: `
      Use this tool to remove a prototype flow from the current page.
      
      Provide the flowName (from GET_CURRENT_PAGE payload.flows or from a previous create-flow).
    `,
    inputSchema: removeFlowSchema,
    function: async (input) => {
      try {
        const response = await sendMessageToPlugin(ClientQueryType.REMOVE_FLOW, input);
        return response;
      } catch (error) {
        return {
          ...ToolResponse,
          success: false,
          message: `Failed to remove flow: ${error.message}`,
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
      
      SENSITIVE PROPERTIES: horizontalSizing and verticalSizing affect board dimensions.
      - "auto": board resizes to fit its children (width/height may change unexpectedly).
      - "fix": board keeps fixed width/height.
      Only include these if you intend to change sizing behavior; omitting them preserves the current values.
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
