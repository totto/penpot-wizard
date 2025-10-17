export function handleGetUserData() {
  return {
    success: true,
    description: 'User data successfully retrieved',
    data: {
      name: penpot.currentUser?.name,
      id: penpot.currentUser?.id,
    },
  };
}

export function handleGetProjectData() {
  return {
    success: true,
    description: 'Project data successfully retrieved',
    data: {
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
        name: penpot.currentPage?.name,
        id: penpot.currentPage?.id,
        shapes: penpot.currentPage?.findShapes({}),
      },
    },
  };
}

export async function handleAddImage(payload: any) {
  const { name, imageData, mimeType } = payload;

  const errorMessage = {
    success: false,
    description: 'Failed to add image',
    data: null,
  }

  try {
    const imageCreatedData = await penpot.uploadMediaData(name, imageData, mimeType);
    if (imageCreatedData) {
      return {
        success: true,
        description: 'Image added successfully',
        data: {
          imageData: imageCreatedData,
        }
      }
    } else {
      throw new Error('error creating image in Penpot');
    }
  } catch (error) {
    errorMessage.description = `Failed to add image: ${error}`;
    return errorMessage;
  }
}