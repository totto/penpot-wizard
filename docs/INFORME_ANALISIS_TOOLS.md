# Informe de análisis de tools – Penpot Wizard

**Fecha:** 21 de febrero de 2025  
**Objetivo:** Analizar todas las tools del proyecto, identificar las que no hacen falta, las que hay que actualizar y las incoherencias con el nuevo enfoque.

---

## 1. Resumen ejecutivo

Existen dos enfoques distintos de tools en el proyecto:

| Enfoque | Archivos | Estado |
|---------|----------|--------|
| **Nuevo (referencia)** | `toolsCreateShapes`, `toolsModifyShapes`, `toolsCompoundShapes` | ✓ Considerado "bueno" |
| **Legacy** | `drawingTools`, `functionTools` (parcial) | Mezcla de activas y obsoletas |

Actualmente **`tools.js`** solo incluye el enfoque nuevo, junto con `functionTools`, `ragTools` e `iconsTool`. **`drawingTools` no está incluido** en el agregado activo.

Hay **referencias rotas**: varios agentes especializados y directores usan tool IDs que no existen en el conjunto actual.

---

## 2. Enfoque nuevo (referencia “buena”)

### 2.1 Características del nuevo enfoque

- **Una tool por tipo de operación**: `create-rectangle`, `modify-ellipse`, etc.
- **Schemas de `shapeTypesNew.js`**: tipos estructurados con Zod.
- **API alineada con Penpot**:
  - `create-*` → `drawShape(type, params)` o `ClientQueryType.DRAW_SHAPE`
  - `modify-*` → `ClientQueryType.MODIFY_SHAPE` o `MODIFY_BOARD`
  - Operaciones compuestas → `ClientQueryType.CREATE_GROUP`, `CONVERT_SHAPES_TO_*`, etc.
- **parentId/parentIndex** documentados para jerarquía y orden.

### 2.2 toolsCreateShapes.js (5 tools)

| ID | Nombre | Función |
|----|--------|---------|
| `create-rectangle` | CreateRectangleTool | Crea un rectángulo |
| `create-ellipse` | CreateEllipseTool | Crea una elipse |
| `create-text` | CreateTextTool | Crea texto |
| `create-path` | CreatePathTool | Crea un path SVG |
| `create-board` | CreateBoardTool | Crea un board |

### 2.3 toolsModifyShapes.js (5 tools)

| ID | Nombre | Función |
|----|--------|---------|
| `modify-rectangle` | ModifyRectangleTool | Modifica un rectángulo existente |
| `modify-ellipse` | ModifyEllipseTool | Modifica una elipse existente |
| `modify-text` | ModifyTextTool | Modifica texto existente |
| `modify-path` | ModifyPathTool | Modifica un path existente |
| `modify-board` | ModifyBoardTool | Modifica un board existente |

### 2.4 toolsCompoundShapes.js (4 tools)

| ID | Nombre | Función |
|----|--------|---------|
| `group-shapes` | GroupShapesTool | Agrupa shapes por IDs |
| `ungroup` | UngroupTool | Desagrupa un grupo |
| `convert-to-board` | ConvertToBoardTool | Convierte shapes a board |
| `convert-to-component` | ConvertToComponentTool | Convierte shapes a componente |

---

## 3. Tools que SÍ están activas (en tools.js)

### 3.1 functionTools.js (7 tools)

| ID | Nombre | Observación |
|----|--------|-------------|
| `get-user-data` | getUserData | OK |
| `get-project-data` | getProjectData | OK |
| `get-current-page` | getCurrentPage | OK |
| `add-image` | AddImageTool | OK |
| `get-fonts` | getFonts | OK |
| `get-selected-shapes` | getSelectedShapes | OK |
| `get-device-size-presets` | getDeviceSizePresets | OK |

### 3.2 ragTools.js (2 tools)

| ID | Nombre | Observación |
|----|--------|-------------|
| `penpot-user-guide-rag` | PenpotUserGuideRagTool | OK |
| `design-styles-rag` | DesignStylesRagTool | OK |

### 3.3 iconsTool.js (2 tools)

| ID | Nombre | Observación |
|----|--------|-------------|
| `get-icon-list` | GetIconList | OK |
| `draw-icon` | IconsTool | OK |

---

## 4. drawingTools.js – NO incluidas en tools.js

`drawingTools` **no está importado** en `tools.js`. Estas tools existen en el código pero **ningún agente las tiene disponibles** en el flujo actual.

### 4. Herramientas en drawingTools (17 tools)

| ID | Descripción | API Plugin | Acción recomendada |
|----|-------------|------------|--------------------|
| `create-boolean` | Boolean entre shapes (union, diff, etc.) | CREATE_BOOLEAN | **Migrar** a archivo nuevo (p. ej. `toolsCompoundShapes`) |
| `align-shapes` | Alinear 2+ shapes | ALIGN_SHAPES | **Migrar** a archivo de utilidades |
| `distribute-shapes` | Distribuir shapes | DISTRIBUTE_SHAPES | **Migrar** a archivo de utilidades |
| `add-navigate-to-interaction` | Navegación entre boards | ADD_INTERACTION | **Migrar** |
| `add-close-overlay-interaction` | Cerrar overlay | ADD_INTERACTION | **Migrar** |
| `add-previous-screen-interaction` | Pantalla anterior | ADD_INTERACTION | **Migrar** |
| `add-open-url-interaction` | Abrir URL | ADD_INTERACTION | **Migrar** |
| `create-flow` | Crear flujo de prototipo | CREATE_FLOW | **Migrar** |
| `remove-flow` | Eliminar flujo | REMOVE_FLOW | **Migrar** |
| `modify-text-range` | Modificar rango de texto | MODIFY_TEXT_RANGE | **Migrar** (mantener id) |
| `rotate-shape` | Rotar shape | ROTATE_SHAPE | **Migrar** |
| `clone-shape` | Clonar shape/componente | CLONE_SHAPE | **Migrar** |
| `bring-to-front-shape` | Traer al frente | BRING_TO_FRONT_SHAPE | **Migrar** |
| `bring-forward-shape` | Traer un paso al frente | BRING_FORWARD_SHAPE | **Migrar** |
| `send-to-back-shape` | Enviar al fondo | SEND_TO_BACK_SHAPE | **Migrar** |
| `send-backward-shape` | Enviar un paso atrás | SEND_BACKWARD_SHAPE | **Migrar** |
| `delete-shape` | Eliminar shape | DELETE_SHAPE | **Migrar** |

Todas usan schemas de `shapeTypes.js` (legacy). Para migrar, conviene alinearlas a schemas tipo `shapeTypesNew.js`.

---

## 5. Referencias rotas (IDs inexistentes)

Los siguientes **tool IDs** aparecen en agentes pero **no existen** en el conjunto actual de tools:

| Tool ID referenciado | Usado en | Existe en tools.js |
|---------------------|----------|--------------------|
| `create-shapes` | MobileViewDesigner, PrintViewDesigner, WebViewDesigner, TestToolsDirector | ❌ No |
| `create-group` | TestToolsDirector | ❌ No (equivalente nuevo: `group-shapes`) |
| `create-component` | TestToolsDirector | ❌ No (equivalente nuevo: `convert-to-component`) |
| `ungroup-shape` | TestToolsDirector | ❌ No (equivalente nuevo: `ungroup`) |
| `convert-group-to-board` | TestToolsDirector | ❌ No |
| `convert-board-to-component` | TestToolsDirector | ❌ No |
| `convert-group-to-component` | TestToolsDirector | ❌ No |
| `modify-shape` | StyleApplicationSpecialist, TestToolsDirector | ❌ No (hay `modify-rectangle`, `modify-ellipse`, etc.) |
| `modify-board` | TestToolsDirector | ✓ Sí |
| `modify-component` | TestToolsDirector | ❌ No |
| `add-navigate-to-interaction` | MobileViewDesigner, WebViewDesigner | ❌ No (en drawingTools) |
| `add-close-overlay-interaction` | MobileViewDesigner, WebViewDesigner | ❌ No |
| `add-previous-screen-interaction` | MobileViewDesigner, WebViewDesigner | ❌ No |
| `add-open-url-interaction` | MobileViewDesigner, WebViewDesigner | ❌ No |
| `create-flow` | MobileViewDesigner, WebViewDesigner | ❌ No |
| `modify-text-range` | StyleApplicationSpecialist | ❌ No (en drawingTools) |

Consecuencia: estos agentes tienen listas de `toolIds` que incluyen herramientas inexistentes o con ids distintos, lo que impide su uso correcto.

---

## 6. Cambios de nomenclatura (viejo vs nuevo)

| Legacy | Nuevo |
|--------|-------|
| `create-shapes` | No existe. Equivalente: llamar varias veces a `create-rectangle`, `create-ellipse`, etc. |
| `create-group` | `group-shapes` |
| `ungroup-shape` | `ungroup` |
| `convert-group-to-board` | `convert-to-board` (usa `shapeIds`, aplica a grupo) |
| `convert-board-to-component` | `convert-to-component` (usa `shapeIds`) |
| `convert-group-to-component` | `convert-to-component` |
| `modify-shape` | `modify-rectangle`, `modify-ellipse`, `modify-text`, `modify-path`, `modify-board` según tipo |

---

## 7. Recomendaciones por categoría

### 7.1 Tools que no hacen falta (eliminar o sustituir)

- **`create-shapes`**: nunca existió como tool. Sustituir por llamadas a `create-rectangle`, `create-ellipse`, etc.
- **`create-component`**: no existe como creación desde cero; usar `convert-to-component`.
- **`convert-group-to-board`**, **`convert-board-to-component`**, **`convert-group-to-component`**: unificar con `convert-to-board` y `convert-to-component` usando `shapeIds` (el plugin ya soporta estas operaciones).

### 7.2 Tools que hay que actualizar (migrar al nuevo enfoque)

| Tool actual | Archivo destino sugerido | Cambios |
|-------------|--------------------------|---------|
| `create-boolean` | `toolsCompoundShapes.js` o nuevo `toolsBooleanShapes.js` | Usar schema en `shapeTypesNew` si existe, o crear uno |
| `align-shapes`, `distribute-shapes` | Nuevo `toolsLayoutShapes.js` o `toolsModifyShapes.js` | Migrar schemas a `shapeTypesNew` |
| `add-*-interaction` (4 tools) | Nuevo `toolsInteractions.js` | Mantener lógica, mejorar schemas |
| `create-flow`, `remove-flow` | Nuevo `toolsFlows.js` | Mantener lógica |
| `modify-text-range` | `toolsModifyShapes.js` | Mantener id para compatibilidad con agentes |
| `rotate-shape`, `clone-shape` | `toolsModifyShapes.js` o nuevo `toolsTransformShapes.js` | Migrar schemas |
| `bring-*-shape`, `send-*-shape` (4 tools) | `toolsModifyShapes.js` o `toolsReorderShapes.js` | Migrar schemas |
| `delete-shape` | `toolsModifyShapes.js` o `toolsDeleteShapes.js` | Migrar schema |

### 7.3 Actualizar agentes

| Agente | Acciones |
|--------|----------|
| **MobileViewDesigner** | Cambiar `create-shapes` → `create-rectangle`, `create-ellipse`, `create-text`, `create-path`. Añadir tools de interacción si se migran. |
| **PrintViewDesigner** | Igual para `create-shapes`. |
| **WebViewDesigner** | Igual + tools de interacción y flujo. |
| **StyleApplicationSpecialist** | Cambiar `modify-shape` por el `modify-*` correcto según tipo (o crear tool `modify-shape` que desvíe al tipo adecuado). Asegurar que `modify-text-range` esté disponible. |
| **TestToolsDirector** | Actualizar todos los IDs al nuevo esquema (ver sección 6). |

### 7.4 Documentación

- **README.md**: dejar de mencionar `drawingTools` como si fuera el conjunto activo; reflejar la estructura actual (`toolsCreateShapes`, `toolsModifyShapes`, `toolsCompoundShapes`, etc.).
- **EXTENDING_TOOLS.md** y **DEVELOPMENT.md**: actualizar listas de tools y ejemplos con los nuevos IDs.
- **get-current-page** (en functionTools): ajustar descripción que habla de "ModifyShapeTool"; referenciar `modify-rectangle`, `modify-ellipse`, etc.

---

## 8. Resumen de acciones

| Prioridad | Acción |
|-----------|--------|
| **Alta** | Incluir `drawingTools` en `tools.js` (o migrar sus tools a archivos nuevos) para que los agentes tengan acceso a interacciones, flujos, delete, rotate, etc. |
| **Alta** | Actualizar `toolIds` en `specializedAgents.js` y `directorAgents.js` al nuevo esquema de IDs. |
| **Media** | Migrar tools de `drawingTools` a archivos organizados por dominio, usando schemas de `shapeTypesNew`. |
| **Media** | Implementar o documentar `create-shapes` como capa de conveniencia (opcional) o eliminar referencias y usar solo `create-*` por tipo. |
| **Baja** | Añadir `modify-component` si el plugin lo soporta y es necesario. |
| **Baja** | Actualizar README y documentación técnica. |

---

## 9. Mapa visual actual

```
tools.js (activo)
├── functionTools ✓
├── toolsCreateShapes ✓ (nuevo enfoque)
├── toolsModifyShapes ✓ (nuevo enfoque)
├── toolsCompoundShapes ✓ (nuevo enfoque)
├── ragTools ✓
└── iconsTool ✓

drawingTools (NO incluido – 17 tools huérfanas)
├── create-boolean
├── align-shapes, distribute-shapes
├── add-*-interaction (4)
├── create-flow, remove-flow
├── modify-text-range
├── rotate-shape, clone-shape
├── bring-*-shape, send-*-shape (4)
└── delete-shape
```

---

*Documento generado para soporte en la migración y consolidación del sistema de tools.*
