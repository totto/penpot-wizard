/**
 * Tools pending upstream fix (Penpot issues).
 * These tools are disabled from agents until the linked issues are resolved.
 *
 * @see https://github.com/penpot/penpot/issues – addInteraction open-overlay/toggle-overlay validation
 */

import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { ToolResponse, ClientQueryType } from '@/types/types';
import { addOverlayInteractionSchema } from '@/types/shapeTypes';

/** Pending: Penpot addInteraction overlay actions fail validation (overlay-position map vs Point). */
export const issuedTools = [
  {
    id: 'add-open-overlay-interaction',
    name: 'AddOpenOverlayInteractionTool',
    description: `
      Add an open-overlay interaction to a shape. Shows a board as modal overlay on top.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
      Use GET_CURRENT_PAGE to get board IDs.
      [DISABLED: Pending Penpot fix - see issuedTools.js]
    `,
    inputSchema: addOverlayInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay, destinationBoardId, relativeToShapeId, position, closeWhenClickOutside, addBackgroundOverlay, animation } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'open-overlay', destinationBoardId, relativeToShapeId, position, closeWhenClickOutside, addBackgroundOverlay, animation } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
  {
    id: 'add-toggle-overlay-interaction',
    name: 'AddToggleOverlayInteractionTool',
    description: `
      Add a toggle-overlay interaction to a shape. Opens overlay if closed, closes if open.
      Triggers: click, mouse-enter, mouse-leave, after-delay (requires delay in ms).
      Use GET_CURRENT_PAGE to get board IDs.
      [DISABLED: Pending Penpot fix - see issuedTools.js]
    `,
    inputSchema: addOverlayInteractionSchema,
    function: async (input) => {
      try {
        const { shapeId, trigger, delay, destinationBoardId, relativeToShapeId, position, closeWhenClickOutside, addBackgroundOverlay, animation } = input;
        const payload = { shapeId, trigger, delay, action: { type: 'toggle-overlay', destinationBoardId, relativeToShapeId, position, closeWhenClickOutside, addBackgroundOverlay, animation } };
        return await sendMessageToPlugin(ClientQueryType.ADD_INTERACTION, payload);
      } catch (error) {
        return { ...ToolResponse, success: false, message: `Failed to add interaction: ${error.message}`, payload: { error: error.message } };
      }
    },
  },
];
