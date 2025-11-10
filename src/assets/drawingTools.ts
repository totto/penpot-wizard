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
    
    Blur intensity guide:
    - 1-3px: Subtle blur for softening edges
    - 5-10px: Moderate blur for background effects  
    - 15-30px: Strong blur for depth of field
    - 50+px: Heavy blur for special effects
    
    If you don't specify blur intensity, a subtle 5px blur will be applied.
  `,
  inputSchema: z.object({
    blurValue: z.number().min(0).max(100).optional().default(5).describe('The blur radius in pixels (0-100). Defaults to 5px for subtle blur if not specified.'),
  }),
  function: async (blurProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_BLUR, blurProperties);
    return response;
  },
},
{
  id: 'apply-fill-tool',
  name: 'ApplyFillTool',
  description: `
    Apply a fill color to the currently selected shapes on the canvas.
    The user must first select the shapes they want to fill before using this tool.
    Use this to change the background color or fill color of shapes.
    
    Fill options:
    - Hex colors: #FF0000, #00FF00, #0000FF, etc.
    - Named colors: red, blue, green, etc.
    - Opacity: 0.0 to 1.0 (0.5 = 50% opacity)
    
    If you don't specify a fill color, black (#000000) will be used.
    If you don't specify opacity, 100% opacity (1.0) will be used.
  `,
  inputSchema: z.object({
    fillColor: z.string().optional().default('#000000').describe('The fill color as a hex string (e.g., #FF5733) or named color. Defaults to black if not specified.'),
    fillOpacity: z.number().min(0).max(1).optional().default(1).describe('The fill opacity from 0.0 (transparent) to 1.0 (opaque). Defaults to 1.0 if not specified.'),
  }),
  function: async (fillProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_FILL, fillProperties);
    return response;
  },
},
{
  id: 'apply-linear-gradient',
  name: 'ApplyLinearGradient',
  description: `
    Apply a linear gradient fill to selected shapes. Creates a smooth color transition along a straight line.
    Perfect for creating depth, highlights, or directional color effects.
    
    This tool applies an intelligent gradient based on your shape's current fill color:
    - If your shape has a color fill, it creates a gradient from that color to white
    - If your shape is already white, it creates a gradient from white to black
    - You can also specify custom colors if desired
    
    Linear gradient options:
    - Colors: Optional array of hex colors or named colors (intelligent defaults based on current fill)
    - Positioning: Optional start/end coordinates (0-1 scale)
    - Angle: Optional angle in degrees for gradient direction
    
    If you don't specify colors, uses intelligent defaults based on your shape's current fill.
    If you don't specify positions, defaults to left-to-right gradient.
    If you don't specify angle, uses the start/end positions.
  `,
  inputSchema: z.object({
    colors: z.array(z.string()).min(2).optional().default(['#3B82F6', '#FFFFFF']).describe("Array of color values (hex codes or named colors). If not specified, uses intelligent defaults based on your shape's current fill color."),
    startX: z.number().optional().describe("Starting X position (0-1, optional, defaults to 0)"),
    startY: z.number().optional().describe("Starting Y position (0-1, optional, defaults to 0)"),
    endX: z.number().optional().describe("Ending X position (0-1, optional, defaults to 1)"),
    endY: z.number().optional().describe("Ending Y position (0-1, optional, defaults to 1)"),
    angle: z.number().optional().describe("Angle in degrees for the gradient direction (optional)"),
  }),
  function: async (gradientProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_LINEAR_GRADIENT, gradientProperties);
    return response;
  },
},
{
  id: 'apply-radial-gradient',
  name: 'ApplyRadialGradient',
  description: `
    Apply a radial gradient fill to selected shapes. Creates a smooth color transition from a center point outward.
    Perfect for creating circular highlights, depth effects, or spotlight-like illumination.
    
    This tool applies an intelligent gradient based on your shape's current fill color:
    - If your shape has a color fill, it creates a gradient from that color to white
    - If your shape is already white, it creates a gradient from white to black
    - You can also specify custom colors if desired
    
    Radial gradient options:
    - Colors: Optional array of hex colors or named colors (intelligent defaults based on current fill)
    - Center: Optional center position (0-1 scale, defaults to center)
    - Outer edge: Optional outer edge position (0-1 scale, defaults to center)
    
    If you don't specify colors, uses intelligent defaults based on your shape's current fill.
    If you don't specify positions, defaults to center-outward gradient.
  `,
  inputSchema: z.object({
    colors: z.array(z.string()).min(2).optional().default(['#3B82F6', '#FFFFFF']).describe("Array of color values (hex codes or named colors). If not specified, uses intelligent defaults based on your shape's current fill color."),
    startX: z.number().optional().describe("Center X position (0-1, optional, defaults to 0.5)"),
    startY: z.number().optional().describe("Center Y position (0-1, optional, defaults to 0.5)"),
    endX: z.number().optional().describe("Outer edge X position (0-1, optional, defaults to 0.5)"),
    endY: z.number().optional().describe("Outer edge Y position (0-1, optional, defaults to 0.5)"),
  }),
  function: async (gradientProperties) => {
    const response = await sendMessageToPlugin(ClientQueryType.APPLY_RADIAL_GRADIENT, gradientProperties);
    return response;
  },
}

];