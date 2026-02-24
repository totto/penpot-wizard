import { generateImage } from 'ai';
import { createImageModelInstance } from '@/utils/modelUtils';
import {
  $availableImageModels,
  $selectedImageModel,
  $openrouterApiKey,
} from '@/stores/settingsStore';

/**
 * Get the currently selected image model from settings.
 * @returns {Object|null} The selected model or null
 */
function getSelectedImageModel() {
  const selectedImageModel = $selectedImageModel.get();
  const availableImageModels = $availableImageModels.get();
  return availableImageModels.find((model) => model.id === selectedImageModel) || null;
}

/**
 * Generate an image using OpenRouter's chat completions API (modalities: image).
 * @param {string} prompt - Text description for the image
 * @param {string} apiKey - OpenRouter API key
 * @param {string} modelId - Model ID (e.g. openai/flux-1.1-pro)
 * @returns {Promise<{uint8Array: Uint8Array, mediaType: string}>}
 */
async function generateOpenRouterImage(prompt, apiKey, modelId) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
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
}

/**
 * Generate an image from a text prompt using the configured image model.
 * Uses OpenRouter or OpenAI based on settings.
 *
 * @param {string} prompt - Text description for the image to generate
 * @param {Object} [options] - Optional generation options
 * @param {string} [options.size] - Size string for non-OpenRouter models (e.g. '1024x1024')
 * @returns {Promise<{uint8Array: Uint8Array, mediaType: string}>}
 */
export async function generateImageFromPrompt(prompt, options = {}) {
  const { width = 1024, height = 1024 } = options;
  const maxSize = Math.max(width, height);
  const selectedModel = getSelectedImageModel();

  if (!selectedModel) {
    throw new Error('Selected image model not found. Configure an image model in settings.');
  }

  if (selectedModel.provider === 'openrouter') {
    const openrouterApiKey = $openrouterApiKey.get();
    if (!openrouterApiKey?.trim()) {
      throw new Error('OpenRouter API key not available');
    }
    return generateOpenRouterImage(prompt, openrouterApiKey, selectedModel.id);
  }

  const imageModelInstance = createImageModelInstance();
  const result = await generateImage({
    model: imageModelInstance,
    prompt,
    size: `${width}x${height}`,
    aspectRatio: `${width/maxSize}:${height/maxSize}`,
  });

  const imagePayload = result.image;
  if (!imagePayload?.uint8Array) {
    throw new Error('Image generation did not return valid image data');
  }

  return {
    uint8Array: imagePayload.uint8Array,
    mediaType: imagePayload.mimeType || imagePayload.mediaType || 'image/png',
  };
}
