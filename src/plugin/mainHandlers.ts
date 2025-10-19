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
      message: 'User data successfully retrieved',
      payload: {
        name: penpot.currentUser.name || '',
        id: penpot.currentUser.id,
      },
    };
  } else {
    return {
      ...pluginResponse,
      success: false,
      message: 'Error retrieving user data',
    }
  }
}

export function handleGetProjectData(): PluginResponseMessage {
  if (penpot.currentFile && penpot.currentPage) {
    return {
      ...pluginResponse,
      message: 'Project data successfully retrieved',
      payload: {
        project: {
          name: penpot.currentFile?.name,
          id: penpot.currentFile?.id,
          pages: penpot.currentFile?.pages.map((page) => ({
            name: page.name,
            id: page.id,
          })),
        },
        availableFonts: penpot.fonts.all.map((font) => ({
          name: font.name,
          fontId: font.fontId,
          fontFamily: font.fontFamily,
        })),
        currentPage: {
          name: penpot.currentPage.name,
          id: penpot.currentPage.id,
          shapes: penpot.currentPage.findShapes({}),
        },
      },
    };
  } else {
    return {
      ...pluginResponse,
      success: false,
      message: 'Error retrieving project data',
    }
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