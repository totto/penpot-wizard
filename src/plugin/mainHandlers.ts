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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (penpot.currentFile as any)?.collaborators ?? [];
  // DEBUG: log the raw collaborators value at runtime so we can confirm the API shape (array or single object)
  // Remove this log after verification.
  console.log('[plugin] getActiveUsers raw value:', raw);
  const users = Array.isArray(raw)
    ? (
        raw.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (u: any) => ({
            id: String(u.id ?? u.userId ?? ''),
            name: u.name ?? u.fullName ?? u.username ?? undefined,
            // API may provide avatarURL (camel U RL) — normalize to avatarUrl
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