import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { ImageData } from '@penpot/plugin-types';
import { tool, experimental_generateImage as generateImage } from 'ai';
import { imageGenerationAgents } from '@/assets/imageGenerationAgents';
import { ClientQueryType, ImageGenerationAgent } from '@/types/types';
import { createImageModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';

let imageGenerationAgentsInitialized = false;

export const $generatedImages = persistentAtom<ImageData[]>('generatedImages', [], {
  encode: (images: ImageData[]) => JSON.stringify(images),
  decode: (value: string) => JSON.parse(value),
});

export const addGeneratedImage = (image: ImageData) => {
  $generatedImages.set([...$generatedImages.get(), image]);
};

// Base atom for image generation agents data
export const $imageGenerationAgentsData = atom<ImageGenerationAgent[]>(
  imageGenerationAgents.map((agent: ImageGenerationAgent) => ({
    ...agent,
  }))
);

// Derived functions for getters
export const getImageGenerationAgentById = (agentId: string) => {
  const agentsData = $imageGenerationAgentsData.get();
  return agentsData.find(a => a.id === agentId) || null;
};

export const getImageGenerationAgentsByIds = (agentIds: string[]) => {
  const agentsData = $imageGenerationAgentsData.get();
  return agentsData
    .filter(agent => agentIds.includes(agent.id))
    .map(agent => agent.instance)
    .filter(Boolean); // Remove undefined instances
};

// Initialize a single image generation agent
const initializeImageGenerationAgent = async (agentDef: ImageGenerationAgent): Promise<ImageGenerationAgent> => {
  const imageModelInstance = createImageModelInstance();
  
  // Create the tool that wraps image generation
  const toolInstance = tool({
    id: agentDef.id as `${string}.${string}`,
    name: agentDef.name,
    description: agentDef.description,
    inputSchema: z.object({
      prompt: z.string().describe('The text description for the image to generate')
    }),
    execute: async ({ prompt }) => {
      try {
        const result = await generateImage({
          model: imageModelInstance,
          prompt: prompt,
        });

        const { image: { uint8Array, mediaType } } = result;
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const addImageResponse = await sendMessageToPlugin(ClientQueryType.ADD_IMAGE, {
          name: imageId,
          imageData: uint8Array,
          mimeType: mediaType,
        });

        const imageData = (addImageResponse as any)?.data?.imageData as ImageData;
        
        if (imageData) {
          addGeneratedImage(imageData);
        }

        return {
          ...addImageResponse,
          data: {
            imageId,
          }
        };
      } catch (error) {
        console.error(`Error executing image generation agent ${agentDef.id}:`, error);
        return {
          success: false,
          message: `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  });
  
  return {
    ...agentDef,
    instance: toolInstance
  };
};

// Action function for initializing image generation agents
export const initializeImageGenerationAgents = async () => {
  if (imageGenerationAgentsInitialized) {
    console.log('Image generation agents already initialized, skipping initialization');
    return;
  }
  
  const isConnected = $isConnected.get();
  if (!isConnected) {
    console.log('Not connected, skipping image generation agents initialization');
    return;
  }
  
  try {
    const agentsData = $imageGenerationAgentsData.get();
    
    // Initialize all image generation agents
    const initializedAgents = await Promise.all(
      agentsData.map(async (agentDef) => {
        try {
          return await initializeImageGenerationAgent(agentDef);
        } catch (error) {
          console.error(`Failed to initialize image generation agent ${agentDef.id}:`, error);
          return agentDef;
        }
      })
    );
    console.log('Initialized image generation agents: ', initializedAgents);
    $imageGenerationAgentsData.set(initializedAgents);
    imageGenerationAgentsInitialized = true;
  } catch (error) {
    console.error('Failed to initialize image generation agents:', error);
  }
};

