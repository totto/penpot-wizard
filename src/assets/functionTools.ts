import { FunctionTool, ClientQueryType } from '@/types/types';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';

// Function to get user data - this would typically come from Penpot context
export const functionTools: FunctionTool[] = [
  {
    id: "get-user-data",
    name: "getUserData",
    description: `
      Use this tool to get information about the active user on Penpot.
      It returns the user name and id.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_USER_DATA, undefined);
      return response;
    },
  },{
    id: "get-project-data",
    name: "getProjectData",
    description: `
      Use this tool to get information about the active project on Penpot.
      This includes: name, id and pages
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_PROJECT_DATA, undefined);
      return response;
    },
  },{
    id: "get-available-fonts",
    name: "getAvailableFonts",
    description: `
      Use this tool to get the available fonts on Penpot.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_AVAILABLE_FONTS, undefined);
      return response;
    },
  },{
    id: "get-current-page",
    name: "getCurrentPage",
    description: `
      Use this tool to get the current page on Penpot.
      This includes: name, id and shapes
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_PAGE, undefined);
      return response;
    },
  },
    {
    id: "get-current-theme",
    name: "getCurrentTheme",
    description: `
      Use this tool to get the current theme (light or dark) on Penpot.
      This includes: 'light' or 'dark'
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_THEME, undefined);
      return response;
    },
  },
   {
    id: "get-active-users",
    name: "getActiveUsers",
    description: `
      Use this tool to list all the active collaborators currently working on the same Penpot project.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_ACTIVE_USERS, undefined);
      return response;
    },
  },
  {
    id: "get-file-versions",
    name: "getFileVersions",
    description: `
      Use this tool to get all saved versions of the current Penpot file.
      It lists version labels, creation dates, and whether they are autosaves or manual saves.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_FILE_VERSIONS, undefined);
      return response;
    },
  },
  // {
  //   id: "get-current-selection",
  //   name: "getCurrentSelection",
  //   description: `
  //     Read-only: returns basic information about the current selection on the canvas.
  //     Each item includes id, name, type and bounding values (x,y,width,height) when available.
  //   `,
  //   inputSchema: z.object({}),
  //   function: async () => {
  //     const response = await sendMessageToPlugin(ClientQueryType.GET_CURRENT_SELECTION, undefined);
  //     return response;
  //   },
  // },
  // NOTE: This tool should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without undo functionality, users cannot easily recover
  // from accidental or unwanted changes made by AI tools.
  {
    id: "undo-last-action",
    name: "undoLastAction",
    description: `
      Undo the most recent action performed by the AI assistant.
      This can reverse fill color changes, blur effects, and other modifications made to shapes.
      Use this when the user wants to revert the last change made by the assistant.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.UNDO_LAST_ACTION, undefined);
      return response;
    },
  },
  // NOTE: This tool should be automatically included on every agent because it is a vital tool
  // for user safety and error recovery. Without redo functionality, users cannot easily restore
  // changes they just undid, creating a frustrating user experience.
  {
    id: "redo-last-action",
    name: "redoLastAction",
    description: `
      Redo the most recently undone action performed by the AI assistant.
      This can reapply fill color changes, blur effects, and other modifications that were previously undone.
      Use this when the user wants to restore a change they just undid.
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.REDO_LAST_ACTION, undefined);
      return response;
    },
  },
];


