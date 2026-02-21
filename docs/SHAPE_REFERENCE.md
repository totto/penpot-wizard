# Shape Reference

This document describes the shape schemas used by the drawing tools. All schemas are defined in `src/types/shapeTypes.js`.

## Stacking Order (Critical)

New shapes appear **below** existing shapes. When creating multiple shapes in one call:

- Create **foreground elements first** (text, icons, buttons)
- Create **backgrounds last** (containers, rectangles)

## Shape Types

| Type | Schema | Description |
|------|--------|-------------|
| rectangle | createRectangleSchema (ShapeBase.partial) | Rectangles with optional border radius |
| ellipse | createEllipseSchema (ShapeBase.partial) | Ellipses / circles |
| path | createPathSchema (Path.partial) | Vector paths with bezier curves (see [PATH_COMMANDS_GUIDE.md](PATH_COMMANDS_GUIDE.md)) |
| text | createTextSchema (Text.partial) | Text layers |

## Base Shape Properties

Shared by all shapes:

| Property | Type | Description |
|----------|------|-------------|
| name | string | Shape label |
| x, y | number | Absolute position (relative to Root Frame) |
| parentX, parentY | number | Position relative to parent |
| parentId | string | Parent board, group, or component |
| parentIndex | number | Stacking order inside parent |
| width, height | number | Dimensions |
| rotation | number | 0–359 degrees |
| flipX, flipY | boolean | Flip flags |
| borderRadius | number | Uniform radius; or borderRadiusTopLeft, etc. |
| opacity | number | 0–1 |
| blendMode | enum | normal, multiply, screen, overlay, etc. |
| fills | array | Fill objects |
| strokes | array | Stroke objects |
| shadows | array | Shadow objects |
| blur | object | Layer blur |
| layoutChild | object | Flex/grid child positioning |
| layoutCell | object | Grid cell placement |

## Fill Schema

One of `fillColor`, `fillColorGradient`, or `fillImage` is required:

- **fillColor**: Hex string (e.g. `#FF5733`), optional `fillOpacity`
- **fillColorGradient**: Linear or radial gradient with stops
- **fillImage**: `{ id, width, height, mtype?, name?, keepAspectRatio? }` – use imageId from image generator

## Gradient Schema

```javascript
{
  type: 'linear' | 'radial',
  startX, startY, endX, endY: 0–1,
  width: 0–1 (radius for radial),
  stops: [{ color, opacity?, offset }]  // min 2 stops
}
```

## Stroke Schema

One of `strokeColor` or `strokeColorGradient`:

- **strokeColor**: Hex, optional `strokeOpacity`, `strokeWidth`, `strokeStyle`, `strokeAlignment`, `strokeCapStart`, `strokeCapEnd`
- **strokeStyle**: solid, dotted, dashed, mixed, none, svg
- **strokeAlignment**: center, inner, outer

## Shadow Schema

- **style**: drop-shadow, inner-shadow
- **offsetX**, **offsetY**, **blur**, **spread**
- **color**: `{ color, opacity }`

## Layout Schemas

### Flex Layout

- **dir**: row, row-reverse, column, column-reverse
- **wrap**: wrap, nowrap
- **alignItems**, **justifyContent**, **rowGap**, **columnGap**, **padding**, etc.

### Grid Layout

- **dir**: column, row
- **rows**, **columns**: array of `{ type, value }` (type: flex, fixed, percent, auto)
- **layoutCell** on children: `row`, `column`, `rowSpan`, `columnSpan` (1-based)

### layoutChild

For children inside flex/grid parents:

- **absolute**: if true, use x/y for absolute positioning
- **alignSelf**, **horizontalSizing**, **verticalSizing**
- **Margins**: horizontalMargin, verticalMargin, or top/right/bottom/left
- **min/max** width/height

## Board and Group

- **Board**: Extends base + `flex`, `grid`, `clipContent`, `horizontalSizing`, `verticalSizing`
- **Group**: Base + child properties
- **Component**: Board + `path` (library component path)

## Path Content

Path shapes use a `content` array of commands. See [PATH_COMMANDS_GUIDE.md](PATH_COMMANDS_GUIDE.md) for syntax and examples.
