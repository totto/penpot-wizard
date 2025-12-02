# Penpot Wizard - Project Context & Developer Rules## 🚨 Critical Safety Rules

1.  **Selection Safety**: NEVER create general selection query tools (e.g., return `penpot.selection`). This crashes JavaFX.
    - **Safe Pattern**: Use [getSelectionForAction()](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/mainHandlers.ts#152-160) inside mutation tools.
    - **Read-Only**: Use `GET_SELECTION_INFO` message for reading selection state in UI.
    - **Workflow**: Tools should read first (via `GET_SELECTION_INFO`), then mutate second (via action tool).
2.  **Undo/Redo**: All reversible actions MUST record [UndoInfo](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/types/types.ts#364-372).
3.  **Code Preservation**:
    - Assume Correctness: Trust existing code.
    - No Deletions: Comment out instead of deleting.
    - False Positives: Don't blindly fix lint errors.

## 🌿 Branching & Strategy

- **Current Branch**: `tools_frank`
- **Workflow**: Create separate branches for each tool from `main` (eventually), but for now working on `tools_frank`.
- **Shared Selection System**: AVOID CHANGES to [src/plugin/selectionHelpers.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/selectionHelpers.ts) and [src/plugin/actionSelection.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/actionSelection.ts).
- **Git Ignore**: Ensure [codealike.json](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/codealike.json) is in [.gitignore](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/.gitignore).

## 💾 Commit Strategy

- **Commit Often, Commit Early**: CRITICAL. Commit after **every single file change** or after completing a single step in a to-do list.
- **Atomic Commits**: ONE file change = ONE commit (before moving to next file, Clear commit message format for easy tracking, One tool at a time - no parallel work, Atomic changes - each commit can be reviewed/rolled back independently
- **Format**: `feat: add [component] to [file]` or `fix: correct [issue] in [file]`.

## 🛠 Tool Development Workflow (7-Step Checklist)

1.  ✅ [src/types/types.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/types/types.ts): Add Enum (`ClientQueryType`), Payload Interface, and Response Interface.
2.  ✅ [src/plugin/mainHandlers.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/mainHandlers.ts): Add handler function (async, typed payload).
3.  ✅ [src/plugin/plugin.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/plugin.ts): Add switch case for the new message type.
4.  ✅ [src/assets/functionTools.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/assets/functionTools.ts): Define the UI tool wrapper.
5.  ✅ [src/assets/tools.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/assets/tools.ts): Export the tool.
6.  ✅ [src/stores/toolsStore.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/stores/toolsStore.ts): Import and initialize.
7.  ✅ [src/assets/directorAgents.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/assets/directorAgents.ts): **CRITICAL**: Add tool ID to agent's `toolIds` array.

## 📝 Coding Standards

- **Language**: TypeScript.
- **React**: Functional components, hooks.
- **Testing**: Vitest (`npm test`).
- **Live Testing**: `npm run build` -> `npm run preview` -> `http://localhost:5174/manifest.json`.

## 📂 Key Files

- [src/plugin/mainHandlers.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/mainHandlers.ts): Plugin tool implementations.
- [src/plugin/plugin.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/plugin/plugin.ts): Message router.
- [src/assets/functionTools.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/assets/functionTools.ts): UI tool definitions.
- [src/assets/directorAgents.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/assets/directorAgents.ts): Agent configurations.
- [src/types/types.ts](file:///Users/frank-nav117/Desktop/OLD_penpot-wizard/src/types/types.ts): Type definitions.
