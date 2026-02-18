# Path Commands Guide

This document describes the path commands used to create vector paths in Penpot. Path shapes use a `content` array of command objects.

## Command Format

Each command has a `command` field and optional `params`:

```javascript
{ command: 'M', params: { x: 50, y: 50 } }
{ command: 'Z' }  // close-path has no params
```

Both short (SVG) and long names are supported.

## Available Commands

| Short | Long | Params | Description |
|-------|------|--------|-------------|
| M | move-to | x, y | Move to point (start new subpath) |
| L | line-to | x, y | Line to point |
| H | line-to-horizontal | x | Horizontal line |
| V | line-to-vertical | y | Vertical line |
| C | curve-to | x, y, c1x, c1y, c2x, c2y | Cubic Bézier curve |
| S | smooth-curve-to | x, y, c2x, c2y | Smooth cubic (first control = reflection) |
| Q | quadratic-bezier-curve-to | x, y, c1x, c1y | Quadratic Bézier |
| T | smooth-quadratic-bezier-curve-to | x, y | Smooth quadratic |
| A | elliptical-arc | rx, ry, x, y, xAxisRotation?, largeArcFlag?, sweepFlag? | Elliptical arc |
| Z | close-path | (none) | Close path to start |

## Examples

### Triangle

```javascript
content: [
  { command: 'M', params: { x: 50, y: 10 } },
  { command: 'L', params: { x: 90, y: 90 } },
  { command: 'L', params: { x: 10, y: 90 } },
  { command: 'Z' }
]
```

### Rectangle (manual path)

```javascript
content: [
  { command: 'M', params: { x: 0, y: 0 } },
  { command: 'L', params: { x: 100, y: 0 } },
  { command: 'L', params: { x: 100, y: 50 } },
  { command: 'L', params: { x: 0, y: 50 } },
  { command: 'Z' }
]
```

### Star (5 points)

```javascript
const cx = 50, cy = 50;
const outer = 40, inner = 20;
const points = 5;
const angleStep = (Math.PI * 2) / points;
const commands = [];

for (let i = 0; i < points; i++) {
  const outerAngle = i * angleStep - Math.PI / 2;
  const innerAngle = (i + 0.5) * angleStep - Math.PI / 2;
  if (i === 0) {
    commands.push({
      command: 'M',
      params: { x: cx + Math.cos(outerAngle) * outer, y: cy + Math.sin(outerAngle) * outer }
    });
  } else {
    commands.push({
      command: 'L',
      params: { x: cx + Math.cos(outerAngle) * outer, y: cy + Math.sin(outerAngle) * outer }
    });
  }
  commands.push({
    command: 'L',
    params: { x: cx + Math.cos(innerAngle) * inner, y: cy + Math.sin(innerAngle) * inner }
  });
}
commands.push({ command: 'Z' });

content: commands
```

### Cubic Bézier Curve

```javascript
content: [
  { command: 'M', params: { x: 10, y: 50 } },
  {
    command: 'C',
    params: {
      c1x: 50, c1y: 10,
      c2x: 90, c2y: 90,
      x: 90, y: 50
    }
  }
]
```

## SVG Conversion

The plugin converts path commands to an SVG path string via `pathCommandsToSvgString()` in `src/plugin/utils.js`. Commands are joined with spaces.

**Note**: The `close-path` command must have no `params` (or empty params).

## Common Errors

- **"Value not valid"**: Ensure all commands have correct params; `Z` has none
- **Missing coordinates**: M, L, C, S, Q, T, A require numeric params
- **Arc params**: `largeArcFlag` and `sweepFlag` are boolean (0/1 in SVG)
