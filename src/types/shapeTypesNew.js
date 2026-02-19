import { z } from 'zod';

import {
  Blur,
  Fill,
  LayoutChildProperties,
  LayoutCellProperties,
  PathCommand,
  Shadow,
  Stroke,
  TextProperties,
  blendModeValues,
} from './shapeTypesSupport';

export const ShapeBase = z.object({
  name: z.string(),
  parentId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  borderRadius: z.number(),
  borderRadiusTopLeft: z.number(),
  borderRadiusTopRight: z.number(),
  borderRadiusBottomRight: z.number(),
  borderRadiusBottomLeft: z.number(),
  opacity: z.number(),
  blendMode: z.enum(blendModeValues),
  shadows: z.array(Shadow),
  blur: Blur,
  parentX: z.number(),
  parentY: z.number(),
  flipX: z.boolean(),
  flipY: z.boolean(),
  rotation: z.number(),
  fills: z.array(Fill),
  strokes: z.array(Stroke),
  layoutChild: LayoutChildProperties,
  layoutCell: LayoutCellProperties,
});

export const Rectangle = ShapeBase.partial().extend({
  type: z.literal('rectangle'),
});

export const Ellipse = ShapeBase.partial().extend({
  type: z.literal('ellipse'),
});

export const Text = ShapeBase.partial().extend({
  type: z.literal('text'),
}).merge(TextProperties);

export const Path = ShapeBase.partial().extend({
  type: z.literal('path'),
  commands: z.array(PathCommand).optional(),
});

export const createShapesSchema = z.object({
  shapes: z.array(
    z.discriminatedUnion('type', [
      Rectangle,
      Ellipse,
      Text,
      Path,
    ])
  ),
});

