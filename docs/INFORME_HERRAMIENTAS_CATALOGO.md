# Informe de catálogo de herramientas – Penpot Wizard

**Fecha:** 21 de febrero de 2025  
**Última actualización:** Migración completa de drawingTools al nuevo sistema.

---

## 1. Resumen ejecutivo

| Categoría | Archivo | Tools | Activo |
|-----------|---------|-------|--------|
| Funciones / Datos | functionTools.js | 7 | ✓ |
| Crear shapes | toolsCreateShapes.js | 5 | ✓ |
| Modificar shapes | toolsModifyShapes.js | 11 | ✓ |
| Operaciones compuestas | toolsCompoundShapes.js | 5 | ✓ |
| Layout | toolsLayoutShapes.js | 2 | ✓ |
| Interacciones | toolsInteractions.js | 4 | ✓ |
| Flows | toolsFlows.js | 2 | ✓ |
| Reorder | toolsReorderShapes.js | 4 | ✓ |
| RAG | ragTools.js | 2 | ✓ |
| Iconos | iconsTool.js | 2 | ✓ |

**Total:** 44 tools activas. `drawingTools.js` eliminado; todas las tools migradas al nuevo sistema.

---

## 2. Estructura de archivos

```
src/assets/
├── tools.js                 ← Punto de entrada
├── functionTools.js         ← 7 tools
├── toolsCreateShapes.js     ← 5 tools
├── toolsModifyShapes.js     ← 11 tools
├── toolsCompoundShapes.js   ← 5 tools (create-boolean, group, ungroup, convert-to-board/component)
├── toolsLayoutShapes.js     ← 2 tools (align, distribute)
├── toolsInteractions.js     ← 4 tools
├── toolsFlows.js            ← 2 tools
├── toolsReorderShapes.js    ← 4 tools
├── ragTools.js              ← 2 tools
└── iconsTool.js             ← 2 tools
```

---

## 3. Catálogo por archivo

### 3.1 functionTools.js
`get-user-data`, `get-project-data`, `get-current-page`, `add-image`, `get-fonts`, `get-selected-shapes`, `get-device-size-presets`

### 3.2 toolsCreateShapes.js
`create-rectangle`, `create-ellipse`, `create-text`, `create-path`, `create-board`

### 3.3 toolsModifyShapes.js
`modify-rectangle`, `modify-ellipse`, `modify-text`, `modify-path`, `modify-boolean`, `modify-board`, `modify-text-range`, `rotate-shape`, `clone-shape`, `delete-shape`

### 3.4 toolsCompoundShapes.js
`create-boolean`, `group-shapes`, `ungroup`, `convert-to-board`, `convert-to-component`

### 3.5 toolsLayoutShapes.js
`align-shapes`, `distribute-shapes`

### 3.6 toolsInteractions.js
`add-navigate-to-interaction`, `add-close-overlay-interaction`, `add-previous-screen-interaction`, `add-open-url-interaction`

### 3.7 toolsFlows.js
`create-flow`, `remove-flow`

### 3.8 toolsReorderShapes.js
`bring-to-front-shape`, `bring-forward-shape`, `send-to-back-shape`, `send-backward-shape`

### 3.9 ragTools.js
`penpot-user-guide-rag`, `design-styles-rag`

### 3.10 iconsTool.js
`get-icon-list`, `draw-icon`

---

*Documento de referencia. Migración completada en fase 8.*
