import {
  AddImagePayload,
  AddImageQueryPayload,
  ClientQueryType,
  GetProjectDataPayload,
  MessageSourceName,
  PluginResponseMessage,

} from "../types/types";

const pluginResponse: PluginResponseMessage = {
  source: MessageSourceName.Plugin,
  type: ClientQueryType.ADD_IMAGE,
  messageId: '',
  message: '',
  success: true,
};

export function handleGetUserData(): PluginResponseMessage {
  if (penpot.currentUser) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA,
      message: 'User data successfully retrieved',
      payload: {
        name: penpot.currentUser.name || '',
        id: penpot.currentUser.id,
      },
    };
  } else {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_USER_DATA,
      success: false,
      message: 'Error retrieving user data',
    }
  }
}

export function handleGetProjectData(): PluginResponseMessage {
  if (penpot.currentFile && penpot.currentPage) {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_PROJECT_DATA,
      message: 'Project data successfully retrieved',
      payload: {
        name: penpot.currentFile?.name,
        id: penpot.currentFile?.id,
        pages: penpot.currentFile?.pages.map((page) => ({
          name: page.name,
          id: page.id,
        })),
      },
    };
  } else {
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_PROJECT_DATA,
      success: false,
      message: 'Error retrieving project data',
    }
  }
}

export function getAvailableFonts(): PluginResponseMessage {
  return {
    ...pluginResponse,
    type: ClientQueryType.GET_AVAILABLE_FONTS,
    message: 'Available fonts successfully retrieved',
    payload: {
      fonts: penpot.fonts.all.map((font) => font.name),
    },
  };
}

export function getCurrentPage(): PluginResponseMessage {
  return {
    ...pluginResponse,
    type: ClientQueryType.GET_CURRENT_PAGE,
    message: 'Current page successfully retrieved',
    payload: {
      name: penpot.currentPage?.name || '',
      id: penpot.currentPage?.id || '',
      shapes: penpot.currentPage?.findShapes({}) || [],
    },
  };
}

export function getCurrentTheme(): PluginResponseMessage {
  return {
    source: MessageSourceName.Plugin,
    type: ClientQueryType.GET_CURRENT_THEME,
    messageId: '',
    message: 'current theme',
    success: true,
    payload: { theme: penpot.theme },
  } as PluginResponseMessage;
}

export function getActiveUsers(): PluginResponseMessage {
  const raw = (penpot.currentFile as any)?.collaborators ?? [];
  const users = Array.isArray(raw)
    ? (
        raw.map(
          (u: any) => ({
            id: String(u.id ?? u.userId ?? ''),
            name: u.name ?? u.fullName ?? u.username ?? undefined,
            avatarUrl: u.avatarUrl ?? u.avatarURL ?? u.avatar ?? undefined,
            color: u.color ?? undefined,
          })
        )
      )
    : [];

  return {
    ...pluginResponse,
    type: ClientQueryType.GET_ACTIVE_USERS,
    message: 'Active users retrieved',
    payload: { users },
  };
}

export function exploreHistoryAPI(): PluginResponseMessage {
  try {
    const historyContext = penpot.history;

    // Demonstrate what the history API is actually for
    const historyInfo = {
      // The history API is for undo/redo operations, not file change history
      explanation: "The Penpot Plugin API 'history' property is for grouping undo operations, not accessing file change history",

      // What the history object contains
      historyObject: historyContext,
      availableMethods: Object.getOwnPropertyNames(historyContext).filter(name =>
        typeof (historyContext as unknown as Record<string, unknown>)[name] === 'function'
      ),

      // Purpose of the history API
      purpose: {
        undoBlockBegin: "Groups multiple operations into a single undo step",
        undoBlockFinish: "Ends the undo grouping",
        usage: "penpot.history.undoBlockBegin(); /* make changes */ penpot.history.undoBlockFinish();"
      },

      // What we CANNOT access (file change history)
      limitations: [
        "File version history (autosaves, saves)",
        "Change history/timeline",
        "Historical file data",
        "Revision history"
      ],

      // What plugins CAN access
      availableData: {
        currentFile: penpot.currentFile ? {
          id: penpot.currentFile.id,
          name: penpot.currentFile.name,
        } : null,
        currentPage: penpot.currentPage ? {
          id: penpot.currentPage.id,
          name: penpot.currentPage.name,
        } : null,
        currentUser: penpot.currentUser ? {
          id: penpot.currentUser.id,
          name: penpot.currentUser.name,
        } : null,
      }
    };

    return {
      ...pluginResponse,
      type: ClientQueryType.EXPLORE_HISTORY_API,
      message: 'History API exploration completed - this API is for undo grouping, not file change history',
      payload: { history: historyInfo },
    };
  } catch (error) {
    return {
      ...pluginResponse,
      type: ClientQueryType.EXPLORE_HISTORY_API,
      success: false,
      message: `Error exploring history API: ${error}`,
    };
  }
} 

export async function handleAddImage(payload: AddImageQueryPayload) : Promise<PluginResponseMessage> {
  const { name, data, mimeType } = payload;

  try {
    const imageCreatedData = await penpot.uploadMediaData(name, data, mimeType);
    if (imageCreatedData) {
      return {
        ...pluginResponse,
        message: 'Image added successfully',
        payload: {
          newImageData: imageCreatedData,
        },
      };
    } else {
      throw new Error('error creating image in Penpot');
    }
  } catch (error) {
    return {
      ...pluginResponse,
      success: false,
      message: `error adding image ${name}: ${error}`,
    }
  }
}

export async function getFileVersions(): Promise<PluginResponseMessage> {
  try {
    if (!penpot.currentFile) {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'No current file available',
      };
    }

    // Check if findVersions method exists
    if (typeof penpot.currentFile.findVersions !== 'function') {
      return {
        ...pluginResponse,
        type: ClientQueryType.GET_FILE_VERSIONS,
        success: false,
        message: 'findVersions method not available on current file',
      };
    }

    console.log('Calling findVersions...');

    // For testing - return empty array to avoid serialization issues
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_FILE_VERSIONS,
      message: `File versions API is available but returning empty array for testing`,
      payload: { versions: [] },
    };
  } catch (error) {
    console.error('Error in getFileVersions:', error);
    return {
      ...pluginResponse,
      type: ClientQueryType.GET_FILE_VERSIONS,
      success: false,
      message: `Error retrieving file versions: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}