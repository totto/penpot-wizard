import { drawShape, sendMessageToPlugin } from '@/utils/pluginUtils';
import { z } from 'zod';
import { PenpotShapeType, FunctionTool, ClientQueryType } from '@/types/types';
import { baseShapeProperties, pathShapeProperties, textShapeProperties } from '@/types/shapeTypes';

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
id: 'create-library-color',
    name: 'CreateLibraryColorTool',
    description: `
      Use this tool to create a new color in the library.
      Provide a name and hex color value.
    `,
    inputSchema: z.object({
      name: z.string().describe('The name of the color in the library'),
      color: z.string().describe('The hex color value, e.g. #FF5733'),
    }),
    function: async (colorProperties) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_COLOR, colorProperties);
      return response;
    },
  },


];
