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
    name: 'CreateLibraryColor',
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
{
    id: 'create-library-font',
    name: 'CreateLibraryFont',
    description: `
      Use this tool to create a new typography style in the library.
      Provide a name, font family, and font size. Optional properties include font weight, style, line height, letter spacing, and text transform.
    `,
    inputSchema: z.object({
      name: z.string().describe('The name of the typography style in the library'),
      fontFamily: z.string().describe('The font family name, e.g. "Inter", "Arial", "Helvetica"'),
      fontSize: z.string().describe('The font size, e.g. "16px", "1.5rem", "24"'),
      fontWeight: z.string().optional().describe('The font weight, e.g. "400", "bold", "normal"'),
      fontStyle: z.enum(['normal', 'italic']).optional().describe('The font style'),
      lineHeight: z.string().optional().describe('The line height, e.g. "1.5", "24px"'),
      letterSpacing: z.string().optional().describe('The letter spacing, e.g. "0.5px", "2%"'),
      textTransform: z.enum(['uppercase', 'capitalize', 'lowercase']).optional().describe('The text transform'),
    }),
    function: async (fontProperties) => {
      const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_FONT, fontProperties);
      return response;
    },
  },
{
  id: 'create-component-from-selection',
  name: 'CreateComponentFromSelection',
  description: `
    Use this tool to create a new component in the library from currently selected shapes.
    
    IMPORTANT: This tool ONLY works with shapes that are currently selected on the canvas.
    - First, ensure you have shapes selected using get-selection tool
    - The component will be created exactly as the selected shapes appear - ALL properties (size, fill, text, stroke, etc.) come directly from the selection
    - Properties are completely optional and depend on what shapes you select:
      * Lines: no fill, no text
      * Rectangles/circles: may have fill and/or stroke
      * Text shapes: have text content and styling
      * Groups: contain multiple shapes with their own properties
    - You MUST provide a name for the component
    
    If no shapes are selected, this tool will return a "NO_SELECTION" response that triggers helpful user guidance.
    Do NOT make assumptions about what properties shapes should have - accept any valid selection.
  `,
  inputSchema: z.object({
    name: z.string().describe('The name for the new component (required)'),
    useSelection: z.boolean().optional().describe('Must be true - this tool only works with selected shapes'),
  }),
  function: async (componentProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.CREATE_LIBRARY_COMPONENT, componentProperties);
    return response;
  },
},
{
  id: 'apply-blur-tool',
  name: 'ApplyBlurTool',
  description: `
    Apply a blur effect to the currently selected shapes on the canvas.
    The user must first select the shapes they want to blur before using this tool.
    Use this to create depth, focus attention, or create visual effects.
  `,
  inputSchema: z.object({
    blurValue: z.number().min(0).max(100).describe('The blur radius in pixels (0-100)'),
    blurType: z.enum(['gaussian', 'box']).optional().default('gaussian').describe('The type of blur effect (gaussian or box)'),
  }),
  function: async (blurProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_BLUR, blurProperties);
    return response;
  },
}

];