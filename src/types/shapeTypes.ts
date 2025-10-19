import { z } from 'zod';

const blendModes = ['difference','normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','exclusion','hue','saturation','color','luminosity'];

export const baseShapeProperties = z.object({
  name: z.string().describe('The name of the shape, used for visual identification and organization'),
  parentId: z.string().optional().describe('The id of the parent shape'),
  x: z.number().describe('The absolute x position of the shape, relative to the Root Frame board'),
  y: z.number().describe('The absolute y position of the shape, relative to the Root Frame board'),
  width: z.number().describe('The width of the shape'),
  height: z.number().describe('The height of the shape'),
  borderRadius: z.number().describe('The border radius of the shape'),
  opacity: z.number().describe('The opacity of the shape'),
  blendMode: z.enum(blendModes).describe('The blend mode of the shape'),
  color: z.string().describe('The color of the shape in hex format'),
  backgroundImage: z.string().optional().describe('The id of the background image'),
});

export const pathShapeProperties = baseShapeProperties.extend({
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
});

export const textShapeProperties = baseShapeProperties.extend({
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
});

export type BaseShapeProperties = z.infer<typeof baseShapeProperties>;
export type PathShapeProperties = z.infer<typeof pathShapeProperties>;
export type TextShapeProperties = z.infer<typeof textShapeProperties>;
export type PenpotShapeProperties = PathShapeProperties | TextShapeProperties;