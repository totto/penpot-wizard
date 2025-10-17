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
    `,
    inputSchema: z.object({}),
    function: async () => {
      console.log('getUserData tool called');
      const response = await sendMessageToPlugin(ClientQueryType.GET_USER_DATA, {});
      console.log('getUserData tool received response: ', response);
      return response;
    },
  }, {
    id: "get-project-data",
    name: "getProjectData",
    description: `
      Use this tool to get information about the active project on Penpot.
      This includes:
      - project data: name, id and pages
      - available fonts: name, fontId and fontFamily
      - current page data: name, id and shapes
    `,
    inputSchema: z.object({}),
    function: async () => {
      const response = await sendMessageToPlugin(ClientQueryType.GET_PROJECT_DATA, {});
      return response;
    },
  }
];

