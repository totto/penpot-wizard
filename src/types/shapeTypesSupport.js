import { z } from 'zod';

const gradientStopSchema = z.object({
  color: z.string(),
  opacity: z.number().min(0).max(1).optional(),
  offset: z.number(),
});

const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']),
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  width: z.number(),
  stops: z.array(gradientStopSchema),
});

const imageDataSchema = z.object({
  name: z.string().optional(),
  width: z.number(),
  height: z.number(),
  mtype: z.string().optional(),
  id: z.string(),
  keepAspectRatio: z.boolean().optional(),
});

export const Fill = z.object({
  fillColor: z.string().optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  fillColorGradient: gradientSchema.optional(),
  fillColorRefFile: z.string().optional(),
  fillColorRefId: z.string().optional(),
  fillImage: imageDataSchema.optional(),
});

const strokeCapValues = [
  'round', 'square', 'line-arrow', 'triangle-arrow',
  'square-marker', 'circle-marker', 'diamond-marker',
];

export const Stroke = z.object({
  strokeColor: z.string().optional(),
  strokeColorRefFile: z.string().optional(),
  strokeColorRefId: z.string().optional(),
  strokeOpacity: z.number().min(0).max(1).optional(),
  strokeStyle: z.enum(['svg', 'none', 'mixed', 'solid', 'dotted', 'dashed']).optional(),
  strokeWidth: z.number().optional(),
  strokeAlignment: z.enum(['center', 'inner', 'outer']).optional(),
  strokeCapStart: z.enum(strokeCapValues).optional(),
  strokeCapEnd: z.enum(strokeCapValues).optional(),
  strokeColorGradient: gradientSchema.optional(),
});

const colorSchema = z.object({
  id: z.string().optional(),
  fileId: z.string().optional(),
  name: z.string().optional(),
  path: z.string().optional(),
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  refId: z.string().optional(),
  refFile: z.string().optional(),
  gradient: gradientSchema.optional(),
  image: imageDataSchema.optional(),
});

export const Shadow = z.object({
  id: z.string().optional(),
  style: z.enum(['drop-shadow', 'inner-shadow']).optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  blur: z.number().optional(),
  spread: z.number().optional(),
  hidden: z.boolean().optional(),
  color: colorSchema.optional(),
});

export const Blur = z.object({
  id: z.string().optional(),
  type: z.enum(['layer-blur']).optional(),
  value: z.number().optional(),
  hidden: z.boolean().optional(),
});

export const LayoutCellProperties = z.object({
  row: z.number().optional(),
  rowSpan: z.number().optional(),
  column: z.number().optional(),
  columnSpan: z.number().optional(),
  areaName: z.string().optional(),
  position: z.enum(['area', 'auto', 'manual']).optional(),
});

export const TextProperties = z.object({
  characters: z.string().optional(),
  growType: z.enum(['fixed', 'auto-width', 'auto-height']).optional(),
  fontId: z.string().optional(),
  fontFamily: z.string().optional(),
  fontVariantId: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.enum(['normal', 'italic', 'mixed']).nullable().optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  textTransform: z.enum(['uppercase', 'capitalize', 'lowercase', 'mixed']).nullable().optional(),
  textDecoration: z.enum(['underline', 'line-through', 'mixed']).nullable().optional(),
  direction: z.enum(['ltr', 'rtl', 'mixed']).nullable().optional(),
  align: z.enum(['left', 'center', 'right', 'justify', 'mixed']).nullable().optional(),
  verticalAlign: z.enum(['top', 'center', 'bottom']).nullable().optional(),
});

export const LayoutChildProperties = z.object({
  absolute: z.boolean().optional(),
  zIndex: z.number().optional(),
  horizontalSizing: z.enum(['fill', 'auto', 'fix']).optional(),
  verticalSizing: z.enum(['fill', 'auto', 'fix']).optional(),
  alignSelf: z.enum(['center', 'auto', 'start', 'end', 'stretch']).optional(),
  horizontalMargin: z.number().optional(),
  verticalMargin: z.number().optional(),
  topMargin: z.number().optional(),
  rightMargin: z.number().optional(),
  bottomMargin: z.number().optional(),
  leftMargin: z.number().optional(),
  maxWidth: z.number().nullable().optional(),
  maxHeight: z.number().nullable().optional(),
  minWidth: z.number().nullable().optional(),
  minHeight: z.number().nullable().optional(),
});

const pathCommandParamsSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  c1x: z.number().optional(),
  c1y: z.number().optional(),
  c2x: z.number().optional(),
  c2y: z.number().optional(),
  rx: z.number().optional(),
  ry: z.number().optional(),
  xAxisRotation: z.number().optional(),
  largeArcFlag: z.boolean().optional(),
  sweepFlag: z.boolean().optional(),
});

export const PathCommand = z.object({
  command: z.enum([
    'M', 'move-to', 'Z', 'close-path', 'L', 'line-to', 'H', 'line-to-horizontal',
    'V', 'line-to-vertical', 'C', 'curve-to', 'S', 'smooth-curve-to',
    'Q', 'quadratic-bezier-curve-to', 'T', 'smooth-quadratic-bezier-curve-to',
    'A', 'elliptical-arc',
  ]),
  params: pathCommandParamsSchema.optional(),
});

export const blendModeValues = [
  'difference', 'normal', 'darken', 'multiply', 'color-burn', 'lighten', 'screen',
  'color-dodge', 'overlay', 'soft-light', 'hard-light', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
];
