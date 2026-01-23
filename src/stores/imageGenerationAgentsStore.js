import { atom } from 'nanostores';
import { tool, generateImage } from 'ai';
import { imageGenerationAgents } from '@/assets/imageGenerationAgents';
import { ClientQueryType } from '@/types/types';
import { createImageModelInstance } from '@/utils/modelUtils';
import { $isConnected } from '@/stores/settingsStore';
import { z } from 'zod';
import { sendMessageToPlugin } from '@/utils/pluginUtils';

let imageGenerationAgentsInitialized = false;

// Base atom for image generation agents data
export const $imageGenerationAgentsData = atom(
  imageGenerationAgents.map((agent) => ({
    ...agent,
  }))
);

// Derived functions for getters
export const getImageGenerationAgentById = (agentId) => {
  const agentsData = $imageGenerationAgentsData.get();
  return agentsData.find(a => a.id === agentId) || null;
};

export const getImageGenerationAgentsByIds = (agentIds) => {
  const agentsData = $imageGenerationAgentsData.get();
  return agentsData.filter(agent => agentIds.includes(agent.id))
};

// Initialize a single image generation agent
const initializeImageGenerationAgent = async (agentDef) => {
  const imageModelInstance = createImageModelInstance();
  
  // Create the tool that wraps image generation
  const toolInstance = tool({
    id: agentDef.id,
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
          size: '1024x1024',
        });

        const { image: { uint8Array, mediaType } } = result;
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const addImageResponse = await sendMessageToPlugin(ClientQueryType.ADD_IMAGE, {
          name: imageId,
          data: uint8Array,
          mimeType: mediaType,
        });
        return addImageResponse;
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
  
  if (imageGenerationAgentsInitialized || !$isConnected.get()) {
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

    $imageGenerationAgentsData.set(initializedAgents);
    imageGenerationAgentsInitialized = true;

  } catch (error) {
    console.error('Failed to initialize image generation agents:', error);
  }
};

