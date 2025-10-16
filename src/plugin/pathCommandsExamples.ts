import type { PathCommand } from '@penpot/plugin-types';
import { pathCommandsToSvgString } from './utils';

/**
 * Ejemplos de uso del parser PathCommand[] -> SVG string
 * 
 * Estos ejemplos muestran cómo crear diferentes formas usando PathCommand[]
 * y convertirlas a strings SVG que Penpot puede usar.
 */

// Ejemplo 1: Triángulo
export const triangleExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 50 } },
  { command: 'line-to', params: { x: 150, y: 50 } },
  { command: 'line-to', params: { x: 100, y: 150 } },
  { command: 'close-path' },
];
// Resultado: "M50,50 L150,50 L100,150 Z"

// Ejemplo 2: Rectángulo
export const rectangleExample: PathCommand[] = [
  { command: 'move-to', params: { x: 0, y: 0 } },
  { command: 'line-to', params: { x: 100, y: 0 } },
  { command: 'line-to', params: { x: 100, y: 50 } },
  { command: 'line-to', params: { x: 0, y: 50 } },
  { command: 'close-path' },
];
// Resultado: "M0,0 L100,0 L100,50 L0,50 Z"

// Ejemplo 3: Curva Bezier (corazón simplificado)
export const heartExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 30 } },
  { command: 'curve-to', params: { 
    c1x: 50, c1y: 10, 
    c2x: 20, c2y: 10, 
    x: 20, y: 30 
  }},
  { command: 'curve-to', params: { 
    c1x: 20, c1y: 50, 
    c2x: 50, c2y: 70, 
    x: 50, y: 90 
  }},
  { command: 'curve-to', params: { 
    c1x: 50, c1y: 70, 
    c2x: 80, c2y: 50, 
    x: 80, y: 30 
  }},
  { command: 'curve-to', params: { 
    c1x: 80, c1y: 10, 
    c2x: 50, c2y: 10, 
    x: 50, y: 30 
  }},
  { command: 'close-path' },
];

// Ejemplo 4: Estrella de 5 puntas
export const starExample: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 0 } },
  { command: 'line-to', params: { x: 61, y: 35 } },
  { command: 'line-to', params: { x: 98, y: 35 } },
  { command: 'line-to', params: { x: 68, y: 57 } },
  { command: 'line-to', params: { x: 79, y: 91 } },
  { command: 'line-to', params: { x: 50, y: 70 } },
  { command: 'line-to', params: { x: 21, y: 91 } },
  { command: 'line-to', params: { x: 32, y: 57 } },
  { command: 'line-to', params: { x: 2, y: 35 } },
  { command: 'line-to', params: { x: 39, y: 35 } },
  { command: 'close-path' },
];

// Ejemplo 5: Línea en zigzag (sin cerrar)
export const zigzagExample: PathCommand[] = [
  { command: 'move-to', params: { x: 0, y: 50 } },
  { command: 'line-to', params: { x: 25, y: 25 } },
  { command: 'line-to', params: { x: 50, y: 50 } },
  { command: 'line-to', params: { x: 75, y: 25 } },
  { command: 'line-to', params: { x: 100, y: 50 } },
];
// No tiene close-path, queda abierto

// Ejemplo 6: Arco elíptico
export const arcExample: PathCommand[] = [
  { command: 'move-to', params: { x: 10, y: 50 } },
  { command: 'elliptical-arc', params: {
    rx: 40,
    ry: 40,
    xAxisRotation: 0,
    largeArcFlag: false,
    sweepFlag: true,
    x: 90,
    y: 50
  }},
];

// Función helper para probar los ejemplos
export function testPathExamples() {
  console.log('=== PATH COMMAND EXAMPLES ===\n');
  
  console.log('Triángulo:', pathCommandsToSvgString(triangleExample));
  console.log('Rectángulo:', pathCommandsToSvgString(rectangleExample));
  console.log('Corazón:', pathCommandsToSvgString(heartExample));
  console.log('Estrella:', pathCommandsToSvgString(starExample));
  console.log('Zigzag:', pathCommandsToSvgString(zigzagExample));
  console.log('Arco:', pathCommandsToSvgString(arcExample));
}

