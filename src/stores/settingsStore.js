import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import OpenAI from 'openai';

// Curated list of OpenAI models we actually want to support
const OPENAI_SUPPORTED_MODELS = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
];

// Curated list of OpenAI image generation models
const OPENAI_IMAGE_MODELS = [
  { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai' },
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai' },
];

// Base atoms for settings
export const $openaiApiKey = persistentAtom('openaiApiKey', '');
export const $openrouterApiKey = persistentAtom('openrouterApiKey', '');
export const $selectedLanguageModel = persistentAtom('selectedLanguageModel', '');
export const $selectedEmbeddingModel = atom('text-embedding-ada-002');
export const $selectedImageModel = persistentAtom('selectedImageModel', '');

export const $availableModels = persistentAtom('availableModels', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
export const $availableImageModels = persistentAtom('availableImageModels', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
export const $isValidatedOpenai = persistentAtom('isValidatedOpenai', false, {
  encode: (value) => value.toString(),
  decode: (value) => value === 'true',
});
export const $isValidatedOpenrouter = persistentAtom('isValidatedOpenrouter', false, {
  encode: (value) => value.toString(),
  decode: (value) => value === 'true',
});
export const $lastFetchTime = persistentAtom('lastFetchTime', null, {
  encode: (value) => value?.toString() ?? '',
  decode: (value) => value ? parseInt(value, 10) : null,
});

// Runtime atoms (not persisted)
export const $isLoadingModels = atom(false);
export const $openaiError = atom(null);
export const $openrouterError = atom(null);

// Derived atoms
export const $isConnected = computed(
  [$openaiApiKey, $isValidatedOpenai, $availableModels, $selectedLanguageModel],
  (openaiApiKey, isValidatedOpenai, availableModels, selectedLanguageModel) => {
    return openaiApiKey !== '' 
      && isValidatedOpenai 
      && availableModels.some(model => model.id === selectedLanguageModel);
  }
);

// Action functions
export const setOpenaiApiKey = (key) => {
  $openaiApiKey.set(key);
  $isValidatedOpenai.set(false);
  $openaiError.set(null);
};

export const setOpenrouterApiKey = (key) => {
  $openrouterApiKey.set(key);
  $isValidatedOpenrouter.set(false);
  $openrouterError.set(null);
};

export const setSelectedLanguageModel = (model) => {
  $selectedLanguageModel.set(model);
};

export const setSelectedImageModel = (model) => {
  $selectedImageModel.set(model);
};

export const clearErrors = () => {
  $openaiError.set(null);
  $openrouterError.set(null);
};

// Async action function for fetching models
export const fetchModels = async () => {
  const openaiApiKey = $openaiApiKey.get();
  const openrouterApiKey = $openrouterApiKey.get();
  
  let models = [];
  let imageModels = [];
  let openaiValidated = false;
  let openrouterValidated = false;
  let openaiError = null;
  let openrouterError = null;
  
  $isLoadingModels.set(true);
  $openaiError.set(null);
  $openrouterError.set(null);
  
  try {
    // Validate OpenAI API key and add supported models
    if (openaiApiKey?.trim()) {
      try {
        const openaiClient = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
        
        // Test API key validity by making a simple request
        await openaiClient.models.list();
        
        // If successful, add our curated list of supported models
        models = [...models, ...OPENAI_SUPPORTED_MODELS];
        imageModels = [...imageModels, ...OPENAI_IMAGE_MODELS];
        openaiValidated = true;
      } catch (error) {
        openaiError = `Failed to validate OpenAI API key: ${error}`;
      }
    }
    
    // Fetch OpenRouter models if API key is provided
    if (openrouterApiKey?.trim()) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter language models (text input/output with structured outputs)
          const openrouterModelList = data.data
            .filter((model) => {
              return model.supported_parameters.includes('structured_outputs')
              && model.architecture.input_modalities.includes('text')
            })
            .map((model) => ({
              id: model.id,
              name: model.name || model.id,
              provider: 'openrouter'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          // Filter image generation models (output modality: image)
          const openrouterImageModelList = data.data
            .filter((model) => {
              return model.architecture.output_modalities?.includes('image')
            })
            .map((model) => ({
              id: model.id,
              name: model.name || model.id,
              provider: 'openrouter'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          models = [...models, ...openrouterModelList];
          imageModels = [...imageModels, ...openrouterImageModelList];
          openrouterValidated = true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.warn('Failed to fetch OpenRouter models:', error);
        openrouterError = `Failed to validate OpenRouter API key: ${error}`;
      }
    }
    
    // Only update models if we have at least one successful validation
    if (models.length > 0) {
      $availableModels.set(models);
      
      // If current selected model is not available, select the first one
      const currentModel = $selectedLanguageModel.get();
      const isCurrentModelAvailable = models.some(model => model.id === currentModel);
      if (!isCurrentModelAvailable) {
        $selectedLanguageModel.set(models[0].id);
      }
    }
    
    // Update image models if we have any
    if (imageModels.length > 0) {
      $availableImageModels.set(imageModels);
      
      // If current selected image model is not available, select the first one
      const currentImageModel = $selectedImageModel.get();
      const isCurrentImageModelAvailable = imageModels.some(model => model.id === currentImageModel);
      if (!isCurrentImageModelAvailable) {
        $selectedImageModel.set(imageModels[0].id);
      }
    }
    
    // Update validation states and errors
    $isValidatedOpenai.set(openaiValidated);
    $isValidatedOpenrouter.set(openrouterValidated);
    $openaiError.set(openaiError);
    $openrouterError.set(openrouterError);
    
  } catch (error) {
    console.error('Error fetching models:', error);
  } finally {
    $isLoadingModels.set(false);
    $lastFetchTime.set(Date.now());
  }
};

// Check API keys action
export const checkApiKeys = async () => {
  const openaiApiKey = $openaiApiKey.get();
  const openrouterApiKey = $openrouterApiKey.get();
  
  // Only proceed if at least one API key is provided
  if (!openaiApiKey?.trim() && !openrouterApiKey?.trim()) {
    console.warn('No API keys provided');
    return;
  }
  
  // Call the fetchModels function directly
  await fetchModels();
};

