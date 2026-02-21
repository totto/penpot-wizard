import { drawShape } from '@/utils/pluginUtils';

import {
  createRectangleSchema,
  createEllipseSchema,
  createTextSchema,
  createBoardSchema,
  createPathSchema,
} from '@/types/shapeTypesNew';

export const toolsCreateShapes = [
  {
    id: 'create-rectangle',
    name: 'CreateRectangleTool',
    description: `
      Creates a single rectangle in Penpot.
      Use parentId to place the rectangle inside a board, group, or component.
      Use parentIndex to define the index at which the rectangle will be inserted in the parent, higher values appear on top of lower values.
    `,
    inputSchema: createRectangleSchema,
    function: async (input) => {
      try {
        const response = await drawShape('rectangle', input);
        return response;
      } catch (error) {
        return {
          success: false,
          message: `Failed to create rectangle: ${error.message}`,
          payload: error,
        };
      }
    },
  },
  {
    id: 'create-ellipse',
    name: 'CreateEllipseTool',
    description: `
      Creates a single ellipse in Penpot.
      Use parentId to place the ellipse inside a board, group, or component.
      Use parentIndex to define the index at which the ellipse will be inserted in the parent, higher values appear on top of lower values.
    `,
    inputSchema: createEllipseSchema,
    function: async (input) => {
      try {
        const response = await drawShape('ellipse', input);
        return response;
      } catch (error) {
        return {
          success: false,
          message: `Failed to create ellipse: ${error.message}`,
          payload: error,
        };
      }
    },
  },
  {
    id: 'create-text',
    name: 'CreateTextTool',
    description: `
      Creates a single text in Penpot.
      To define the fontFamily, you should use the tool get-fonts to know the available fonts.
      Use parentId to place the text inside a board, group, or component.
      Use parentIndex to define the index at which the text will be inserted in the parent, higher values appear on top of lower values.
    `,
    inputSchema: createTextSchema,
    function: async (input) => {
      try {
        const response = await drawShape('text', input);
        return response;
      } catch (error) {
        return {
          success: false,
          message: `Failed to create text: ${error.message}`,
          payload: error,
        };
      }
    },
  },
  {
    id: 'create-path',
    name: 'CreatePathTool',
    description: `
      Creates a single path (vector shape) in Penpot.
      Use content to define the path as an array of SVG path commands (move-to, line-to, curve-to, close-path, etc.).
      Use parentId to place the path inside a board, group, or component.
      Use parentIndex to define the index at which the path will be inserted in the parent, higher values appear on top of lower values.
    `,
    inputSchema: createPathSchema,
    function: async (input) => {
      try {
        const response = await drawShape('path', input);
        return response;
      } catch (error) {
        return {
          success: false,
          message: `Failed to create path: ${error.message}`,
          payload: error,
        };
      }
    },
  },
  {
    id: 'create-board',
    name: 'CreateBoardTool',
    description: `
      Creates a single board in Penpot.
      Use parentId to place the board inside a board, group, or component.
      Use parentIndex to define the index at which the board will be inserted in the parent, higher values appear on top of lower values.
      
      IMPORTANT!!
      If you are planning to add items to the board, order them by layoutChild.zIndex or parentIndex in ascending order and then add them to the board.
    `,
    inputSchema: createBoardSchema,
    function: async (input) => {
      try {
        const response = await drawShape('board', input);
        return response;
      } catch (error) {
        return {
          success: false,
          message: `Failed to create board: ${error.message}`,
          payload: error,
        };
      }
    },
  },
];
