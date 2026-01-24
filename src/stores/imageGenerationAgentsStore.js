import { atom } from 'nanostores';
import { tool, generateImage } from 'ai';
import { imageGenerationAgents } from '@/assets/imageGenerationAgents';
import { ClientQueryType, ToolResponse } from '@/types/types';
import { createImageModelInstance } from '@/utils/modelUtils';
import { 
  $isConnected,
  $availableImageModels,
  $selectedImageModel,
  $openrouterApiKey
} from '@/stores/settingsStore';
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
  const getSelectedImageModel = () => {
    const selectedImageModel = $selectedImageModel.get();
    const availableImageModels = $availableImageModels.get();
    return availableImageModels.find((model) => model.id === selectedImageModel) || null;
  };

  const generateOpenRouterImage = async (prompt) => {
    const openrouterApiKey = $openrouterApiKey.get();
    if (!openrouterApiKey?.trim()) {
      throw new Error('OpenRouter API key not available');
    }

    const selectedModel = getSelectedImageModel();
    if (!selectedModel) {
      throw new Error('Selected image model not found');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel.id,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenRouter image generation failed: ${errorMessage}`);
    }

    const data = await response.json();
    const images = data?.choices?.[0]?.message?.images;
    const imageUrl = images?.[0]?.image_url?.url || images?.[0]?.imageUrl?.url;

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('OpenRouter image response did not include image data');
    }

    if (!imageUrl.startsWith('data:')) {
      throw new Error('OpenRouter image response is not a data URL');
    }

    const [header, base64Data] = imageUrl.split(',');
    const mediaTypeMatch = header.match(/^data:(.*);base64$/);
    const mediaType = mediaTypeMatch?.[1] || 'image/png';

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return { uint8Array: bytes, mediaType };
  };
  
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
        const selectedModel = getSelectedImageModel();
        const isOpenRouterModel = selectedModel?.provider === 'openrouter';

        let imagePayload;
        if (isOpenRouterModel) {
          imagePayload = await generateOpenRouterImage(prompt);
        } else {
          const imageModelInstance = createImageModelInstance();
          const result = await generateImage({
            model: imageModelInstance,
            prompt: prompt,
            size: '1024x1024',
          });
          imagePayload = result.image;
        }

        const { uint8Array, mediaType } = imagePayload;
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
          ...ToolResponse,
          success: false,
          message: `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          payload: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
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

