# Guía de PathCommands en Penpot

## Problema y Solución

### El Problema
Cuando trabajas con la API de plugins de Penpot, los tipos TypeScript indican que `PathShape.content` acepta un array de `PathCommand[]`:

```typescript
interface PathShape {
  content: Array<PathCommand>;
}
```

Sin embargo, **internamente Penpot solo acepta strings SVG**. Si intentas asignar un array de objetos `PathCommand[]` directamente, obtendrás un error de validación:

```
[PENPOT PLUGIN] Value not valid: [object Object],[object Object]... Code: :content
```

### La Solución
Usar la función `pathCommandsToSvgString()` para convertir arrays de `PathCommand` a strings SVG antes de asignarlos.

## Uso Básico

```typescript
import { pathCommandsToSvgString } from '@/utils/pluginUtils';
import type { PathCommand } from '@penpot/plugin-types';

// 1. Definir los comandos como array
const commands: PathCommand[] = [
  { command: 'move-to', params: { x: 50, y: 50 } },
  { command: 'line-to', params: { x: 150, y: 50 } },
  { command: 'line-to', params: { x: 100, y: 150 } },
  { command: 'close-path' },
];

// 2. Convertir a string SVG
const svgString = pathCommandsToSvgString(commands);
// Resultado: "M50,50 L150,50 L100,150 Z"

// 3. Asignar al shape (necesita 'as any' por el tipo incorrecto)
const shape = penpot.createPath();
shape.content = svgString as any;
```

## Comandos Soportados

### Move To (Mover a un punto)
```typescript
{ command: 'move-to', params: { x: 50, y: 50 } }
// o la forma corta:
{ command: 'M', params: { x: 50, y: 50 } }
// Genera: "M50,50"
```

### Line To (Línea recta)
```typescript
{ command: 'line-to', params: { x: 100, y: 100 } }
// o: { command: 'L', params: { x: 100, y: 100 } }
// Genera: "L100,100"
```

### Horizontal Line (Línea horizontal)
```typescript
{ command: 'line-to-horizontal', params: { x: 100 } }
// o: { command: 'H', params: { x: 100 } }
// Genera: "H100"
```

### Vertical Line (Línea vertical)
```typescript
{ command: 'line-to-vertical', params: { y: 100 } }
// o: { command: 'V', params: { y: 100 } }
// Genera: "V100"
```

### Curve To (Curva Bézier cúbica)
```typescript
{ 
  command: 'curve-to', 
  params: { 
    c1x: 20, c1y: 10,  // Primer punto de control
    c2x: 80, c2y: 10,  // Segundo punto de control
    x: 100, y: 50      // Punto final
  }
}
// Genera: "C20,10 80,10 100,50"
```

### Smooth Curve (Curva Bézier cúbica suave)
```typescript
{ 
  command: 'smooth-curve-to', 
  params: { 
    c2x: 80, c2y: 10,  // Punto de control
    x: 100, y: 50      // Punto final
  }
}
// Genera: "S80,10 100,50"
```

### Quadratic Bezier Curve (Curva Bézier cuadrática)
```typescript
{ 
  command: 'quadratic-bezier-curve-to', 
  params: { 
    c1x: 50, c1y: 10,  // Punto de control
    x: 100, y: 50      // Punto final
  }
}
// Genera: "Q50,10 100,50"
```

### Smooth Quadratic Bezier (Curva Bézier cuadrática suave)
```typescript
{ 
  command: 'smooth-quadratic-bezier-curve-to', 
  params: { 
    x: 100, y: 50  // Punto final
  }
}
// Genera: "T100,50"
```

### Elliptical Arc (Arco elíptico)
```typescript
{ 
  command: 'elliptical-arc', 
  params: { 
    rx: 40,                    // Radio X
    ry: 40,                    // Radio Y
    xAxisRotation: 0,          // Rotación del eje X (grados)
    largeArcFlag: false,       // Arco grande o pequeño
    sweepFlag: true,           // Dirección del arco
    x: 90, y: 50              // Punto final
  }
}
// Genera: "A40,40 0 0,1 90,50"
```

### Close Path (Cerrar camino)
```typescript
{ command: 'close-path' }
// o: { command: 'Z' }
// Genera: "Z"
// IMPORTANTE: No debe tener parámetros
```

## Ejemplos Completos

Ver el archivo `src/utils/pathCommandsExamples.ts` para ejemplos de:
- Triángulo
- Rectángulo
- Corazón (con curvas Bézier)
- Estrella de 5 puntas
- Zigzag (path abierto)
- Arco elíptico

## Notas Importantes

1. **Siempre usa strings SVG** para asignar `content` en Penpot
2. **`close-path` no debe tener parámetros** (ni siquiera un objeto vacío con x/y)
3. **El tipo TypeScript está incorrecto**: usa `as any` al asignar strings
4. **Puedes usar nombres largos o cortos**: 'move-to' o 'M', 'line-to' o 'L', etc.
5. **Cuando lees `shape.content`** siempre obtienes un string, nunca un array

## Por Qué Funciona Así

Internamente, Penpot está escrito en Clojure/ClojureScript. Cuando asignas `content`:

1. Si pasas un **string**: Penpot lo parsea correctamente usando `svg.path/parse`
2. Si pasas un **array**: Los objetos JavaScript no se convierten correctamente a las estructuras de datos de Clojure, causando errores de validación

Por eso, **siempre convierte a string primero** usando `pathCommandsToSvgString()`.

