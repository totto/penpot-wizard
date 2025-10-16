import { sendMessageToPlugin } from '@/utils/pluginUtils';
import { ClientQueryType, PenpotShapeType, FunctionTool } from '@/types/types';
import { z } from 'zod';

const blendModes = ['difference','normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','exclusion','hue','saturation','color','luminosity'];

const penpotShapeProperties = z.object({
  parentId: z.string().optional().describe('The id of the parent shape'),
  x: z.number().describe('The x position of the rectangle'),
  y: z.number().describe('The y position of the rectangle'),
  width: z.number().describe('The width of the rectangle'),
  height: z.number().describe('The height of the rectangle'),
  borderRadius: z.number().describe('The border radius of the rectangle'),
  borderRadiusTopLeft: z.number().describe('The border radius of the top left corner of the rectangle'),
  borderRadiusTopRight: z.number().describe('The border radius of the top right corner of the rectangle'),
  borderRadiusBottomLeft: z.number().describe('The border radius of the bottom left corner of the rectangle'),
  borderRadiusBottomRight: z.number().describe('The border radius of the bottom right corner of the rectangle'),
  opacity: z.number().describe('The opacity of the rectangle'),
  blendMode: z.enum(blendModes).describe('The blend mode of the rectangle'),
  color: z.string().describe('The color of the rectangle in hex format'),
});

export const drawingTools: FunctionTool[] = [
  {
    id: "rectangle-maker",
    name: "RectangleMakerTool",
    description: `
      Use this tool to draw a rectangle.
    `,
    inputSchema: penpotShapeProperties,
    function: async (shapeProperties) => {
      console.log('RectangleMakerTool called with params: ', shapeProperties);
      const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
        shapeType: PenpotShapeType.RECTANGLE,
        params: shapeProperties,
      });
      console.log('RectangleMakerTool received response: ', response);
      return response;
    },
  }, {
    id: 'ellipse-maker',
    name: 'EllipseMakerTool',
    description: `
      Use this tool to draw an ellipse.
    `,
    inputSchema: penpotShapeProperties,
    function: async (shapeProperties) => {
      console.log('EllipseMakerTool called with params: ', shapeProperties);
      const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
        shapeType: PenpotShapeType.ELLIPSE,
        params: shapeProperties,
      });
      console.log('EllipseMakerTool received response: ', response);
      return response;
    },
  }, {
    id: 'path-maker',
    name: 'PathMakerTool',
    description: `
      Use this tool to draw a path. You can draw complex shapes like stars, polygons, curves, etc. using the path tool.
      you should define the path with the content property, defining an array of path commands.
      Possible types of path command are:
      - 'M' or 'move-to': Move to a new point.
      - 'Z' or 'close-path': Close the current path.
      - 'L' or 'line-to': Draw a straight line to a new point.
      - 'H' or 'line-to-horizontal': Draw a horizontal line to a new point.
      - 'V' or 'line-to-vertical': Draw a vertical line to a new point.
      - 'C' or 'curve-to': Draw a cubic Bezier curve to a new point.
      - 'S' or 'smooth-curve-to': Draw a smooth cubic Bezier curve to a new point.
      - 'Q' or 'quadratic-bezier-curve-to': Draw a quadratic Bezier curve to a new point.
      - 'T' or 'smooth-quadratic-bezier-curve-to': Draw a smooth quadratic Bezier curve to a new point.
      - 'A' or 'elliptical-arc': Draw an elliptical arc to a new point.
    `,
    inputSchema: penpotShapeProperties.extend({
      content: z.array(z.object({
        command: z.enum(['M', 'move-to', 'Z', 'close-path', 'L', 'line-to', 'H', 'line-to-horizontal', 'V', 'line-to-vertical', 'C', 'curve-to', 'S', 'smooth-curve-to', 'Q', 'quadratic-bezier-curve-to', 'T', 'smooth-quadratic-bezier-curve-to', 'A', 'elliptical-arc']).describe('The path command type'),
        params: z.object({
          x: z.number().optional().describe('The x-coordinate of the point (or endpoint)'),
          y: z.number().optional().describe('The y-coordinate of the point (or endpoint)'),
          c1x: z.number().optional().describe('The x-coordinate of the first control point for curves'),
          c1y: z.number().optional().describe('The y-coordinate of the first control point for curves'),
          c2x: z.number().optional().describe('The x-coordinate of the second control point for curves'),
          c2y: z.number().optional().describe('The y-coordinate of the second control point for curves'),
          rx: z.number().optional().describe('The radius of the ellipse\'s x-axis'),
          ry: z.number().optional().describe('The radius of the ellipse\'s y-axis'),
          xAxisRotation: z.number().optional().describe('The rotation angle of the ellipse\'s x-axis'),
          largeArcFlag: z.boolean().optional().describe('A flag indicating whether to use the larger arc'),
          sweepFlag: z.boolean().optional().describe('A flag indicating the direction of the arc'),
        }).optional().describe('The parameters of the path command'),
      })).describe('The array of path commands that defines the path'),
    }),
    function: async (shapeProperties) => {
      console.log('PathMakerTool called with params: ', shapeProperties);
      const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
        shapeType: PenpotShapeType.PATH,
        params: shapeProperties,
      });
      console.log('PathMakerTool received response: ', response);
      return response;
    },
  }, {
    id: 'text-maker',
    name: 'TextMakerTool',
    description: `
      Use this tool to draw a text.
    `,
    inputSchema: penpotShapeProperties.extend({
      characters: z.string().describe('The characters to draw'),
      fontId: z.string().describe('The font id of the text'),
      fontFamily: z.string().describe('The font family of the text'),
      fontSize: z.number().describe('The font size of the text'),
      fontWeight: z.number().describe('The font weight of the text'),
      fontStyle: z.enum(['normal', 'italic']).optional().describe('The font style of the text'),
      lineHeight: z.number().describe('The line height of the text'),
      letterSpacing: z.number().describe('The letter spacing of the text'),
      textTransform: z.enum(['uppercase', 'lowercase', 'capitalize']).optional().describe('The text transform of the text'),
      textDecoration: z.enum(['underline', 'line-through']).optional().describe('The text decoration of the text'),
      direction: z.enum(['ltr', 'rtl']).optional().describe('The direction of the text'),
      align: z.enum(['left', 'center', 'right']).optional().describe('The align of the text'),
      verticalAlign: z.enum(['top', 'center', 'bottom']).optional().describe('The vertical align of the text'),
    }),
    function: async (shapeProperties) => {
      console.log('TextMakerTool called with params: ', shapeProperties);
      const response = await sendMessageToPlugin(ClientQueryType.DRAW_SHAPE, {
        shapeType: PenpotShapeType.TEXT,
        params: shapeProperties,
      });
      console.log('TextMakerTool received response: ', response);
      return response;
    },
  },
];
