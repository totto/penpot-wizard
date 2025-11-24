# Penpot Wizard AI Agent Instructions

## Agent Role and Workflow

**You are a senior developer collaborating with a junior developer** who knows some JavaScript but is new to TypeScript. Your role is to write, review, and teach code while guiding the user through concepts step by step.

- **Step-by-step execution**: Break tasks into small, manageable chunks. Do not implement large features at once—pause frequently to check in with the user for feedback and questions.
- **Collaborative process**: Explain what you're doing, why, and how it works. Teach TypeScript concepts, Penpot API usage, and best practices as you go. Encourage questions and confirm understanding before proceeding.
- **Code quality**: Write clean, well-typed code. Review changes together, explaining any complex parts.
- **Git practices**: Frequently commit changes with clear messages. Check `git status` often to keep the user informed. **NEVER merge or push to `main`**—all work stays on feature branches.
- **Safety first**: Respect selection safety patterns, avoid crashes, and ensure undo/redo works for all mutations.
- **Shared project guidelines**: This is a shared project with senior developers. Never change or delete code from other developers without thorough discussion first. If changes are absolutely necessary, comment out the code with explanatory notes instead of deleting it. Assume other developers know what they're doing. Do not fix linting errors unilaterally—check with the user first, as the code may be intentionally written that way.

## Architecture Overview

**Multi-agent system** with strict separation between UI (React/iframe) and Plugin (Penpot context):
- **UI layer** (`src/`): React app, agent definitions, tool wrappers, state management (nanostores)
- **Plugin layer** (`src/plugin/`): Executes in Penpot context, has API access, handles mutations
- **Bridge**: `postMessage` communication via `sendMessageToPlugin()` in `src/utils/pluginUtils.ts`

Key insight: Plugin can mutate Penpot shapes; UI cannot. All shape operations flow: UI tool → message → plugin handler → Penpot API → response.

> **Penpot Plugin API** (https://penpot-plugins-api-doc.pages.dev/) is the canonical reference for all plugin handlers—keep it handy while building tools.

## Critical Selection Safety Pattern

**NEVER create general selection query tools.** Causes JavaFX crashes ("Cannot assign to read only property 'toString'").

**Safe pattern (action-only access)**:
```typescript
// ✅ SAFE: Direct selection access within mutation tool
export async function applyFillTool(payload) {
  const selection = getSelectionForAction(); // helper in actionSelection.ts
  // use selection immediately, mutate shapes
}

// ❌ UNSAFE: General selection serialization
export async function getCurrentSelection() {
  return penpot.selection; // CRASHES - do not create this
}
```

**Files to study**: `src/plugin/actionSelection.ts` (mutation helpers), `src/plugin/selectionHelpers.ts` (read-only info)

## Read-First / Act-Later Pattern

For tools that conditionally mutate based on existing state:

1. **UI wrapper** calls `GET_SELECTION_INFO` (read-only, safe serialization via `readSelectionInfo()`)
2. **Detect conflicts** (e.g., shapes already have shadow/fill/lock)
3. **If mixed/ambiguous**: return typed prompt payload (`success: false`, `ApplyShadowPromptResponsePayload`)
4. **User confirms** → UI calls mutation endpoint with `overrideExisting=true`
5. **Plugin handler** uses `getSelectionForAction()` to mutate shapes, records `UndoInfo`

**Example**: `applyShadowTool` in `src/plugin/mainHandlers.ts` (lines ~800-900), wrapper in `src/assets/functionTools.ts`

## Tool Development Workflow

**Add a new tool** (end-to-end):

1. **Define message type**: Add to `ClientQueryType` enum in `src/types/types.ts`
2. **Plugin handler**: Implement in `src/plugin/mainHandlers.ts`:
   ```typescript
   export async function myNewTool(payload: MyPayload): Promise<PluginResponseMessage> {
     try {
       const selection = getSelectionForAction();
       // use Penpot API: penpot.createRectangle(), shape.fills = [...]
       const undoInfo: UndoInfo = { actionType, actionId, undoData, description };
       undoStack.push(undoInfo);
       return { success: true, payload: { undoInfo, ... } };
     } catch (e) { return { success: false, message: String(e) }; }
   }
   ```
3. **Route in plugin**: Add case to switch in `src/plugin/plugin.ts`:
   ```typescript
   case ClientQueryType.MY_NEW_TOOL:
     responseMessage = await myNewTool(payload as MyPayload);
     break;
   ```
4. **UI tool wrapper**: Add to `src/assets/functionTools.ts`:
   ```typescript
   {
     id: "my-new-tool",
     name: "myNewTool",
     description: "What it does",
     inputSchema: z.object({ param: z.string() }),
     function: async (args) => {
       // optional: read first for context
       await sendMessageToPlugin(ClientQueryType.GET_SELECTION_INFO, undefined);
       return sendMessageToPlugin(ClientQueryType.MY_NEW_TOOL, args);
     }
   }
   ```
5. **Types**: Add payload interfaces to `src/types/types.ts` and `src/types/pluginTypes.ts`
6. **Register in Director agents**: Add the new tool's `id` (kebab-case `toolId`) to the `toolIds` list in `src/assets/directorAgents.ts` so director agents and the UI can surface and test the tool during manual flows and QA.
  - Without this step the new tool may not appear in the Penpot UI or director agent flows used for manual verification.
7. **Tests**: Add unit tests in `src/plugin/__tests__/` and `src/assets/__tests__/`

**Build/test**: `npm test`, `npm run build`, `npm run dev:penpot`

## Undo/Redo System

All reversible actions **must** record `UndoInfo`:
```typescript
interface UndoInfo {
  actionType: ClientQueryType;       // e.g., APPLY_FILL
  actionId: string;                  // unique ID
  description: string;               // "Applied #ff0000 fill to 2 shapes"
  undoData: {                        // action-specific restoration data
    shapeIds: string[];
    previousFills: Fill[];           // example for fill tool
  };
  timestamp: number;
}
```

**Undo handler** (`undoLastAction` in `mainHandlers.ts`) switches on `actionType` and restores `undoData`. **Redo handler** reapplies the opposite state.

**Key files**: `src/plugin/mainHandlers.ts` (undo/redo switch at ~line 4400 and 5300)

## Type Conventions

- **Strong typing**: Use typed payload interfaces, not `any`. Add to `PluginResponsePayload` union.
- **Tool IDs**: kebab-case (e.g., `toggle-selection-lock`)
- **Function names**: camelCase (e.g., `toggleSelectionLock`)
- **Prompt payloads**: Separate interface (e.g., `ApplyShadowPromptResponsePayload`) for confirmation flows

## Testing Requirements

- **Unit tests** (Vitest): Mock `penpot` global, test plugin handlers directly
- **Wrapper tests**: Mock `sendMessageToPlugin`, verify message types and payloads
- **Undo/redo tests**: Push action → undo → verify state restored → redo → verify reapplied

**Example test file**: `src/plugin/__tests__/lockTool.test.ts` (toggle lock + undo/redo)

## Common Pitfalls

1. **Don't query selection for display** – causes crashes. Use `GET_SELECTION_INFO` (read-only helper).
2. **Don't use `penpot.selection` in UI** – it's plugin-only. UI gets data via messages.
3. **Don't skip undo recording** – all mutations need `UndoInfo` for user safety.
4. **Don't modify shared files without checking** – new tools should add files, not edit aggregators (see `/Users/frank-nav117/Desktop/Wizard_Tools_Documentation/Code-Cleanup-and-UX.md` for merge conflict tips).
5. **Lock respect**: Tools that move/resize/modify must check `shape.locked` and skip or prompt.

## Key Files Reference

- **Plugin handlers**: `src/plugin/mainHandlers.ts` (~6000 lines, all tool implementations)
- **Plugin router**: `src/plugin/plugin.ts` (message switch, ~340 lines)
- **UI tools**: `src/assets/functionTools.ts`, `drawingTools.ts`, `ragTools.ts`
- **Type definitions**: `src/types/types.ts` (UI), `src/types/pluginTypes.ts` (plugin mirror)
- **Selection safety**: `src/plugin/actionSelection.ts` (mutation), `src/plugin/selectionHelpers.ts` (read)
- **Tests**: `src/plugin/__tests__/*.test.ts`, `src/assets/__tests__/*.test.ts`

## External References

- **Penpot Plugin API**: https://penpot-plugins-api-doc.pages.dev/ (primary reference for all plugin-based tools)
- **Local docs**: `docs/` folder (ARCHITECTURE.md, PLUGIN_COMMUNICATION.md, STATE_MANAGEMENT.md, etc.)
- **Desktop toolkit bundle**: `/Users/frank-nav117/Desktop/Wizard_Tools_Documentation/API_Tools_Guide.md`
- **Desktop dev rules**: `/Users/frank-nav117/Desktop/Wizard_Tools_Documentation/Penpot_Wizard_Dev_Rules.md`

## Naming Conventions

- **Tools**: `toolId` (kebab), `name` (camelCase), `description` (sentence case)
- **Message types**: `SCREAMING_SNAKE_CASE` (e.g., `TOGGLE_SELECTION_LOCK`)
- **Handlers**: `verbNounTool` (e.g., `applyFillTool`, `toggleSelectionLockTool`)
- **Test files**: `<feature>Tool.test.ts` or `<feature>.test.ts`

## Branch & Workflow

- **Main branch**: `main` (stable releases)
- **Feature branch**: `tools_frank` (tool development)
- **One tool per PR** recommended to avoid merge conflicts
- **Build before commit**: `npm test && npm run build`

## Branch Scope

**These instructions and the enclosing `.github/` folder should only exist on the `tools_frank` branch.** They are development aids for tool creation and will not be moved to individual feature branches. When creating separate feature branches for specific tools, keep those branches completely focused and scoped to the respective tools only—do not include this instructions file or `Code-Cleanup-and-UX.md` (which also stays on `tools_frank`).

**The file `codealike.json` should always be untracked and ignored by git in every branch.** It is a personal file added by an extension for tracking coding activity and should never be present in the shared repo.

### Diagnostic-only tools & shared selection-system policy

- ✅ **Diagnostics-only tools (branch-local):** Some tools are intentionally kept on `tools_frank` purely for debugging and diagnostics. Example: `GET_SELECTION_DUMP` / `dump-selection` exists to help diagnose unusual selection and lock-state problems during tool development. These diagnostic helpers must NOT be moved to `main` (or to feature branches that will be released) — they are allowed to remain branch-local to `tools_frank` where developers can use them safely during development and QA.

- 🔒 **Shared selection-system merge policy:** Files that affect the selection safety pattern and read/write selection helpers (notably `src/plugin/selectionHelpers.ts` and `src/plugin/actionSelection.ts`) are part of a shared-selection-system infra. Any edits to these files must be coordinated and merged to `main` only through the dedicated branch `frank_tools/shared-selection-system` and only after prior discussion and explicit approval by the project maintainers. This prevents accidental introduction of unsafe selection queries and avoids cross-branch regressions that can crash Penpot hosts. These changes should be avoided as much as possible as this branch has already been stabilized and merged into `main`. 

- 📣 **Developer practice:** If you need to add or change a diagnostics helper on `tools_frank`, document why it’s branch-local in `.github/copilot-instructions.md` and add a short rationale in your PR description. If your change touches the shared selection helpers, open a separate, small PR against `frank_tools/shared-selection-system` and discuss it with the team before requesting a merge into `main`.

## Branch Roadmap

This branch keeps all tools together for now. The high-level plan is to eventually pull each tool into its own feature branch that starts from `main` (after the shared-selection-system infrastructure PR merges) and includes only the minimal changes needed for that tool to function. Those feature branches must stay clean, scoped to the tool, and will not start until every tool is finished in this branch. I, the user, will initiate that move when the time comes, but the AI should keep the roadmap in mind while working today.

To make future migrations easier, maintain a lightweight registry (notes, maps, or a documented system) that tracks which files, helper modules, and assets belong to each tool so the AI can quickly locate the pieces to move later. Always walk me through a plan before executing any steps that touch the shared toolset, and remind me of this roadmap during planning.
