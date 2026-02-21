# Plan de migración: drawingTools → nuevo sistema

**Objetivo:** Migrar las 17 tools de `drawingTools.js` al nuevo enfoque (archivos organizados por dominio, schemas en `shapeTypesNew.js`, integradas en `tools.js`).

**Estado actual:** `drawingTools` existe pero **no está importado** en `tools.js`, por lo que agentes como MobileViewDesigner, WebViewDesigner y StyleApplicationSpecialist referencian tools que no tienen acceso. TestToolsDirector también las lista pero no funcionan.

---

## 1. Estructura de destino

| Archivo nuevo | Tools a migrar | Criterio |
|---------------|----------------|----------|
| `toolsCompoundShapes.js` (extender) | `create-boolean` | Operación compuesta sobre shapes |
| `toolsLayoutShapes.js` (nuevo) | `align-shapes`, `distribute-shapes` | Layout/posicionamiento |
| `toolsInteractions.js` (nuevo) | 4 tools `add-*-interaction` | Prototipado |
| `toolsFlows.js` (nuevo) | `create-flow`, `remove-flow` | Flujos de prototipo |
| `toolsModifyShapes.js` (extender) | `modify-text-range`, `rotate-shape`, `clone-shape` | Modificación de shapes |
| `toolsReorderShapes.js` (nuevo) | `bring-*-shape`, `send-*-shape` (4) | Orden de apilamiento |
| `toolsModifyShapes.js` (extender) | `delete-shape` | Eliminación |

---

## 2. Estrategia de schemas

**Opción elegida:** Añadir los schemas necesarios a `shapeTypesNew.js` (o archivo asociado `shapeTypesSupport.js`) para mantener coherencia con el nuevo sistema.

| Schema | Ubicación actual | Acción |
|--------|------------------|--------|
| `createBooleanSchema` | shapeTypes.js | Copiar/adaptar a shapeTypesNew.js |
| `alignShapesSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `distributeShapesSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `addNavigateToInteractionSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `addCloseOverlayInteractionSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `addPreviousScreenInteractionSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `addOpenUrlInteractionSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `createFlowSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `removeFlowSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `modifyTextRangeSchema` | shapeTypes.js | Copiar/adaptar a shapeTypesNew.js |
| `rotateShapeSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `cloneShapeSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| `reorderShapeSchema` | shapeTypes.js | Copiar a shapeTypesNew.js |
| delete-shape | inline en drawingTools | Crear schema en shapeTypesNew.js |

---

## 3. Fases de migración

### Fase 0: Preparación (1 sesión)

1. Crear rama de trabajo `feature/migrate-drawing-tools`.
2. Revisar que todos los tests pasen antes de empezar.
3. Documentar el orden de migración y dependencias.

---

### Fase 1: Schemas en shapeTypesNew.js (1-2 sesiones)

**Objetivo:** Centralizar todos los schemas de las tools a migrar en `shapeTypesNew.js` (o archivo dedicado si crece mucho).

**Tareas:**

1. Abrir `src/types/shapeTypesNew.js`.
2. Añadir imports necesarios de `shapeTypes.js` si hay reutilización, o copiar schemas completos.
3. Añadir/exportar:
   - `createBooleanSchema`
   - `alignShapesSchema`
   - `distributeShapesSchema`
   - `addNavigateToInteractionSchema`
   - `addCloseOverlayInteractionSchema`
   - `addPreviousScreenInteractionSchema`
   - `addOpenUrlInteractionSchema`
   - `createFlowSchema`
   - `removeFlowSchema`
   - `modifyTextRangeSchema`
   - `rotateShapeSchema`
   - `cloneShapeSchema`
   - `reorderShapeSchema`
   - `deleteShapeSchema` (nuevo: `z.object({ shapeId: z.string() })`)

**Criterio de éxito:** Los schemas se importan desde shapeTypesNew y las tools de drawingTools pueden usarlos temporalmente (sin cambiar drawingTools aún).

---

### Fase 2: toolsCompoundShapes – create-boolean (1 sesión)

**Objetivo:** Migrar `create-boolean` a `toolsCompoundShapes.js`.

**Tareas:**

1. En `toolsCompoundShapes.js`:
   - Importar `createBooleanSchema` desde `shapeTypesNew`.
   - Importar `ClientQueryType`, `sendMessageToPlugin`, `ToolResponse`.
   - Añadir la tool `create-boolean` (misma lógica que en drawingTools).
2. Probar que TestToolsDirector puede ejecutar una operación boolean.
3. Verificar que el plugin responde correctamente.

---

### Fase 3: toolsLayoutShapes – align y distribute (1 sesión)

**Objetivo:** Crear `toolsLayoutShapes.js` con align y distribute.

**Tareas:**

1. Crear `src/assets/toolsLayoutShapes.js`:
   - Importar schemas, ClientQueryType, sendMessageToPlugin, ToolResponse.
   - Añadir `align-shapes`.
   - Añadir `distribute-shapes`.
2. Registrar el archivo en `tools.js`.
3. Probar con TestToolsDirector.

---

### Fase 4: toolsInteractions – 4 tools de interacción (1 sesión)

**Objetivo:** Crear `toolsInteractions.js` con las 4 tools de interacción.

**Tareas:**

1. Crear `src/assets/toolsInteractions.js`:
   - `add-navigate-to-interaction`
   - `add-close-overlay-interaction`
   - `add-previous-screen-interaction`
   - `add-open-url-interaction`
2. Cada una usa `ClientQueryType.ADD_INTERACTION` con payload con `action.type` distinto (ver drawingTools).
3. Registrar en `tools.js`.
4. Comprobar que MobileViewDesigner y WebViewDesigner pueden usarlas (cuando estén en tools.js).

---

### Fase 5: toolsFlows – create-flow y remove-flow (0.5 sesión)

**Objetivo:** Crear `toolsFlows.js`.

**Tareas:**

1. Crear `src/assets/toolsFlows.js`:
   - `create-flow`
   - `remove-flow`
2. Registrar en `tools.js`.
3. Probar con TestToolsDirector o MobileViewDesigner.

---

### Fase 6: toolsModifyShapes – modify-text-range, rotate, clone, delete (1 sesión)

**Objetivo:** Extender `toolsModifyShapes.js` con 4 tools más.

**Tareas:**

1. En `toolsModifyShapes.js`:
   - Añadir `modify-text-range`
   - Añadir `rotate-shape`
   - Añadir `clone-shape`
   - Añadir `delete-shape`
2. Importar schemas desde shapeTypesNew y ClientQueryType correspondientes.
3. Probar StyleApplicationSpecialist (modify-text-range) y TestToolsDirector.

---

### Fase 7: toolsReorderShapes – bring/send (1 sesión)

**Objetivo:** Crear `toolsReorderShapes.js` para las 4 tools de orden.

**Tareas:**

1. Crear `src/assets/toolsReorderShapes.js`:
   - `bring-to-front-shape`
   - `bring-forward-shape`
   - `send-to-back-shape`
   - `send-backward-shape`
2. Todas usan `reorderShapeSchema` y su `ClientQueryType` respectivo.
3. Registrar en `tools.js`.
4. Probar con TestToolsDirector.

---

### Fase 8: Integración y limpieza (1 sesión) ✓ COMPLETADA

**Objetivo:** Unificar en `tools.js` y deprecar `drawingTools.js`.

**Tareas:**

1. En `tools.js`:
   - Importar `toolsLayoutShapes`, `toolsInteractions`, `toolsFlows`, `toolsReorderShapes`.
   - Añadirlos al array exportado.
   - **No** importar `drawingTools`.
2. Verificar que todos los agentes tienen acceso a las tools que referencian:
   - MobileViewDesigner
   - WebViewDesigner
   - PrintViewDesigner
   - StyleApplicationSpecialist
   - TestToolsDirector
3. ~~Comentar o eliminar `drawingTools.js`~~ → Eliminado. Todas las tools migradas.
4. Actualizar documentación (EXTENDING_TOOLS.md, INFORME_HERRAMIENTAS_CATALOGO.md, README si aplica).

---

### Fase 9: Validación y ajustes (0.5 sesión)

1. Ejecutar flujos completos: móvil, web, print, style application.
2. Confirmar que no hay referencias rotas a tools de drawingTools.
3. Revisar linter y tests.
4. Actualizar INFORME_ANALISIS_TOOLS.md con el nuevo estado.

---

## 4. Orden de implementación (resumen)

| # | Fase | Archivos afectados | Esfuerzo estimado |
|---|------|--------------------|-------------------|
| 0 | Preparación | - | 15 min |
| 1 | Schemas | shapeTypesNew.js | 1-2 h |
| 2 | create-boolean | toolsCompoundShapes.js | 30 min |
| 3 | align, distribute | toolsLayoutShapes.js (nuevo), tools.js | 45 min |
| 4 | 4 interactions | toolsInteractions.js (nuevo), tools.js | 1 h |
| 5 | flows | toolsFlows.js (nuevo), tools.js | 30 min |
| 6 | modify-text-range, rotate, clone, delete | toolsModifyShapes.js | 1 h |
| 7 | reorder (4 tools) | toolsReorderShapes.js (nuevo), tools.js | 45 min |
| 8 | Integración final | tools.js, drawingTools.js, docs | 1 h |
| 9 | Validación | Todo | 30 min |

**Total estimado:** 6-8 horas de desarrollo.

---

## 5. Estructura final de tools.js

```javascript
import { functionTools } from './functionTools';
import { toolsCreateShapes } from './toolsCreateShapes';
import { toolsModifyShapes } from './toolsModifyShapes';
import { toolsCompoundShapes } from './toolsCompoundShapes';
import { toolsLayoutShapes } from './toolsLayoutShapes';
import { toolsInteractions } from './toolsInteractions';
import { toolsFlows } from './toolsFlows';
import { toolsReorderShapes } from './toolsReorderShapes';
import { ragTools } from './ragTools';
import { iconsTool } from './iconsTool';

export const tools = [
  ...functionTools,
  ...toolsCreateShapes,
  ...toolsModifyShapes,
  ...toolsCompoundShapes,
  ...toolsLayoutShapes,
  ...toolsInteractions,
  ...toolsFlows,
  ...toolsReorderShapes,
  ...ragTools,
  ...iconsTool,
];
```

---

## 6. Criterios de aceptación por tool

Cada tool migrada debe:

1. Tener `id`, `name`, `description`, `inputSchema`, `function` con la misma firma que el sistema nuevo.
2. Usar schemas importados desde `shapeTypesNew.js` (o el archivo de schemas unificado).
3. Usar `sendMessageToPlugin` con el `ClientQueryType` correcto.
4. Devolver objetos con estructura `{ success, message, payload }` en caso de error.
5. Mantener el mismo `id` para compatibilidad con agentes existentes.

---

## 7. Agentes – toolIds a verificar tras migración

| Agente | tools que usará tras migración |
|--------|--------------------------------|
| **MobileViewDesigner** | create-*, get-current-page, get-icon-list, draw-icon, add-*-interaction (4), create-flow |
| **WebViewDesigner** | get-device-size-presets, create-*, get-current-page, get-icon-list, draw-icon, add-*-interaction (4), create-flow, add-image |
| **PrintViewDesigner** | get-device-size-presets, create-*, get-current-page, design-styles-rag, add-image |
| **StyleApplicationSpecialist** | design-styles-rag, get-current-page, get-selected-shapes, modify-* (5), modify-text-range |
| **TestToolsDirector** | Todas las tools migradas |

No se requiere cambiar los `toolIds` de los agentes: los IDs se mantienen iguales.

---

## 8. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Schemas incompatibles entre shapeTypes y shapeTypesNew | Revisar diferencias (baseShapeProperties vs ShapeBase) antes de copiar |
| Plugin no soporta algún ClientQueryType | Verificar plugin.js y drawHandlers.js antes de migrar cada tool |
| Regresiones en agentes | Probar cada fase con el agente que usa esas tools |

---

## 9. Checklist de migración por tool

```
[x] create-boolean          → toolsCompoundShapes ✓
[x] align-shapes            → toolsLayoutShapes ✓
[x] distribute-shapes       → toolsLayoutShapes ✓
[x] add-navigate-to-interaction    → toolsInteractions ✓
[x] add-close-overlay-interaction  → toolsInteractions ✓
[x] add-previous-screen-interaction→ toolsInteractions ✓
[x] add-open-url-interaction       → toolsInteractions ✓
[x] create-flow             → toolsFlows ✓
[x] remove-flow             → toolsFlows ✓
[x] modify-text-range       → toolsModifyShapes ✓
[x] rotate-shape            → toolsModifyShapes ✓
[x] clone-shape             → toolsModifyShapes ✓
[x] bring-to-front-shape     → toolsReorderShapes ✓
[x] bring-forward-shape     → toolsReorderShapes ✓
[x] send-to-back-shape      → toolsReorderShapes ✓
[x] send-backward-shape     → toolsReorderShapes ✓
[x] delete-shape            → toolsModifyShapes ✓
```

---

*Documento de planificación. Ejecutar fase por fase y validar antes de continuar.*
