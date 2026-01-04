# Informe: Curación del Output de Shapes en Tools

## Objetivo
Identificar las propiedades que deben eliminarse del output de las tools para reducir el ruido y mostrar solo información relevante y configurable por el agente.

## Contexto
Actualmente, las tools devuelven el objeto `Shape` completo de Penpot, que incluye muchas propiedades internas, compuestas y no configurables. Esto genera output innecesariamente verboso y confuso para el agente.

## Análisis de Propiedades

### Propiedades Configurables (MANTENER)
Estas propiedades están definidas en los schemas de `shapeTypes.ts` y pueden ser configuradas por el agente al crear shapes:

**BaseShapeProperties:**
- `id` - Identificador único (generado por Penpot, pero necesario para referencia)
- `name` - Nombre de la forma
- `type` - Tipo de forma (rectangle, ellipse, path, text, board)
- `x` - Posición X
- `y` - Posición Y
- `width` - Ancho
- `height` - Alto
- `borderRadius` - Radio de borde
- `opacity` - Opacidad
- `blendMode` - Modo de mezcla
- `fills` - Array de rellenos
- `strokes` - Array de trazos
- `shadows` - Array de sombras

**PathShapeProperties (adicionales):**
- `content` - Contenido del path (array de comandos)

**TextShapeProperties (adicionales):**
- `characters` - Texto
- `fontFamily` - Familia de fuente
- `fontSize` - Tamaño de fuente
- `fontWeight` - Peso de fuente
- `fontStyle` - Estilo de fuente (normal, italic)
- `lineHeight` - Altura de línea
- `letterSpacing` - Espaciado de letras
- `textTransform` - Transformación de texto
- `textDecoration` - Decoración de texto
- `direction` - Dirección del texto
- `align` - Alineación horizontal
- `verticalAlign` - Alineación vertical

---

## Propiedades a Eliminar

### 1. Propiedades Compuestas (Calculadas)

Estas propiedades son derivadas de otras propiedades y no deben configurarse directamente:

- **`bounds`** - Objeto compuesto que contiene `{x, y, width, height}`. Es redundante ya que estas propiedades ya están disponibles individualmente.
- **`center`** - Objeto compuesto que contiene `{x, y}` calculado del centro. Se puede calcular de `x + width/2` y `y + height/2`.
- **`parentX`** - Posición X relativa al padre. Calculada internamente por Penpot.
- **`parentY`** - Posición Y relativa al padre. Calculada internamente por Penpot.
- **`boardX`** - Posición X relativa al board. Calculada internamente por Penpot.
- **`boardY`** - Posición Y relativa al board. Calculada internamente por Penpot.

### 2. Propiedades No Configurables al Crear Shapes

Estas propiedades no están en los schemas de creación y no pueden ser definidas por el agente:

- **`blocked`** - Estado de bloqueo (no configurable en creación)
- **`hidden`** - Estado de visibilidad (no configurable en creación)
- **`visible`** - Estado de visibilidad derivado (no configurable)
- **`proportionLock`** - Bloqueo de proporción (no configurable en creación)
- **`constraintsHorizontal`** - Restricciones horizontales (no configurable en creación)
- **`constraintsVertical`** - Restricciones verticales (no configurable en creación)
- **`rotation`** - Rotación (no está en baseShapeProperties, no configurable)
- **`flipX`** - Volteo horizontal (no configurable en creación)
- **`flipY`** - Volteo vertical (no configurable en creación)
- **`blur`** - Efecto de desenfoque (no está en los schemas, no configurable)
- **`exports`** - Configuración de exportación (no configurable en creación)
- **`parentIndex`** - Índice en el padre (propiedad interna de Penpot)
- **`layoutChild`** - Propiedad de layout interno (no configurable)
- **`layoutCell`** - Propiedad de layout interno (no configurable)
- **`interactions`** - Interacciones del shape (no configurable en creación)
- **`tokens`** - Tokens internos (propiedad interna de Penpot)

### 3. Propiedades Derivadas de borderRadius

Estas propiedades son derivadas de `borderRadius` y son redundantes:

- **`borderRadiusTopLeft`** - Derivado de `borderRadius`
- **`borderRadiusTopRight`** - Derivado de `borderRadius`
- **`borderRadiusBottomRight`** - Derivado de `borderRadius`
- **`borderRadiusBottomLeft`** - Derivado de `borderRadius`

**Nota:** Si `borderRadius` está presente, estas cuatro propiedades son redundantes ya que todas tienen el mismo valor que `borderRadius` (a menos que Penpot permita valores individuales en el futuro, pero actualmente no están en los schemas de creación).

### 4. Propiedades de Estructura Interna

- **`parent`** - Referencia al padre (puede causar referencias circulares). En su lugar, si es necesario, se puede incluir `parentId` como string.

---

## Resumen de Propiedades a Eliminar

### Categoría: Compuestas (6 propiedades)
1. `bounds`
2. `center`
3. `parentX`
4. `parentY`
5. `boardX`
6. `boardY`

### Categoría: No Configurables (13 propiedades)
1. `blocked`
2. `hidden`
3. `visible`
4. `proportionLock`
5. `constraintsHorizontal`
6. `constraintsVertical`
7. `rotation`
8. `flipX`
9. `flipY`
10. `blur`
11. `exports`
12. `parentIndex`
13. `interactions`
14. `tokens`

### Categoría: Layout Interno (2 propiedades)
1. `layoutChild`
2. `layoutCell`

### Categoría: Derivadas de borderRadius (4 propiedades)
1. `borderRadiusTopLeft`
2. `borderRadiusTopRight`
3. `borderRadiusBottomRight`
4. `borderRadiusBottomLeft`

### Categoría: Referencias (1 propiedad)
1. `parent` (objeto completo, usar `parentId` si es necesario)

---

## Propiedades a Mantener (Output Final)

### Propiedades Base (Todas las shapes)
- `id`
- `name`
- `type`
- `x`
- `y`
- `width`
- `height`
- `borderRadius`
- `opacity`
- `blendMode`
- `fills` (array)
- `strokes` (array)
- `shadows` (array)

### Propiedades Específicas de Path
- `content` (array de comandos de path)

### Propiedades Específicas de Text
- `characters`
- `fontFamily`
- `fontSize`
- `fontWeight`
- `fontStyle`
- `lineHeight`
- `letterSpacing`
- `textTransform`
- `textDecoration`
- `direction`
- `align`
- `verticalAlign`

### Propiedades Opcionales de Referencia
- `parentId` (string, si el shape tiene un padre)

---

## Implementación Recomendada

La función de limpieza debe implementarse en `pluginUtils.ts` y debe:

1. **Usar los tipos de `shapeTypes.ts`** para determinar qué propiedades mantener
2. **Eliminar todas las propiedades listadas arriba**
3. **Aplicarse a todas las respuestas de shapes** que vienen del plugin:
   - `DRAW_SHAPE` response
   - `MODIFY_SHAPE` response
   - `CREATE_GROUP` response (si incluye shapes)
   - Cualquier otra respuesta que contenga shapes

4. **Mantener la estructura de arrays** para `fills`, `strokes`, y `shadows`, pero limpiar también las propiedades internas de estos objetos si las hay.

5. **Considerar diferentes tipos de shapes** (rectangle, ellipse, path, text, board) y aplicar la limpieza según el tipo.

---

## Notas Adicionales

- La función debe ser **type-safe** y usar los tipos definidos en `shapeTypes.ts`
- Debe manejar casos donde algunas propiedades puedan ser `null` o `undefined`
- La limpieza debe ser **idempotente** (aplicarla múltiples veces debe dar el mismo resultado)
- Considerar si `zIndex` debe incluirse en el output (actualmente se usa para ordenamiento pero no se devuelve en la respuesta del plugin)

