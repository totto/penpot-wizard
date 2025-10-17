import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import OpenAI from 'openai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { EmbeddingModel } from 'ai';

export interface LanguageModel {
  id: string;
  name: string;
  provider: 'openai' | 'openrouter';
}

export interface ImageModel {
  id: string;
  name: string;
  provider: 'openai' | 'openrouter';
}

// Curated list of OpenAI models we actually want to support
const OPENAI_SUPPORTED_MODELS: LanguageModel[] = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
];

// Curated list of OpenAI image generation models
const OPENAI_IMAGE_MODELS: ImageModel[] = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai' },
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai' },
];

// Storage interface for persistence
interface SettingsStorage {
  openaiApiKey: string;
  openrouterApiKey: string;
  selectedLanguageModel: string;
  availableModels: LanguageModel[];
  isValidatedOpenai: boolean;
  isValidatedOpenrouter: boolean;
  lastFetchTime: number | null;
}

// Base atoms for settings
export const $openaiApiKey = persistentAtom('openaiApiKey', '');
export const $openrouterApiKey = persistentAtom('openrouterApiKey', '');
export const $selectedLanguageModel = persistentAtom('selectedLanguageModel', '');
export const $selectedEmbeddingModel = atom<string>('text-embedding-ada-002');
export const $selectedImageModel = persistentAtom('selectedImageModel', '');

export const $availableModels = persistentAtom<LanguageModel[]>('availableModels', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
export const $availableImageModels = persistentAtom<ImageModel[]>('availableImageModels', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
export const $isValidatedOpenai = persistentAtom('isValidatedOpenai', false, {
  encode: (value: boolean) => value.toString(),
  decode: (value: string) => value === 'true',
});
export const $isValidatedOpenrouter = persistentAtom('isValidatedOpenrouter', false, {
  encode: (value: boolean) => value.toString(),
  decode: (value: string) => value === 'true',
});
export const $lastFetchTime = persistentAtom<number | null>('lastFetchTime', null, {
  encode: (value: number | null) => value?.toString() ?? '',
  decode: (value: string) => value ? parseInt(value, 10) : null,
});

// Runtime atoms (not persisted)
export const $isLoadingModels = atom<boolean>(false);
export const $openaiError = atom<string | null>(null);
export const $openrouterError = atom<string | null>(null);

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
export const setOpenaiApiKey = (key: string) => {
  $openaiApiKey.set(key as any);
  $isValidatedOpenai.set(false);
  $openaiError.set(null);
};

export const setOpenrouterApiKey = (key: string) => {
  $openrouterApiKey.set(key as any);
  $isValidatedOpenrouter.set(false);
  $openrouterError.set(null);
};

export const setSelectedLanguageModel = (model: string) => {
  $selectedLanguageModel.set(model as any);
};

export const setSelectedImageModel = (model: string) => {
  $selectedImageModel.set(model as any);
};

export const clearErrors = () => {
  $openaiError.set(null);
  $openrouterError.set(null);
};

// Async action function for fetching models
export const fetchModels = async () => {
  const openaiApiKey = $openaiApiKey.get();
  const openrouterApiKey = $openrouterApiKey.get();
  
  let models: LanguageModel[] = [];
  let imageModels: ImageModel[] = [];
  let openaiValidated = false;
  let openrouterValidated = false;
  let openaiError: string | null = null;
  let openrouterError: string | null = null;
  
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
      } catch (error: any) {
        console.warn('Failed to validate OpenAI API key:', error);
        openaiError = error?.message || error?.error?.message || 'Failed to validate OpenAI API key';
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
          const openrouterModelList: LanguageModel[] = data.data
            .filter((model: any) => {
              return model.supported_parameters.includes('structured_outputs')
              && model.architecture.input_modalities.includes('text')
            })
            .map((model: any) => ({
              id: model.id,
              name: model.name || model.id,
              provider: 'openrouter' as const
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          // Filter image generation models (output modality: image)
          const openrouterImageModelList: ImageModel[] = data.data
            .filter((model: any) => {
              return model.architecture.output_modalities?.includes('image')
            })
            .map((model: any) => ({
              id: model.id,
              name: model.name || model.id,
              provider: 'openrouter' as const
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
      } catch (error: any) {
        console.warn('Failed to fetch OpenRouter models:', error);
        openrouterError = error?.message || 'Failed to validate OpenRouter API key';
      }
    }
    
    // Only update models if we have at least one successful validation
    if (models.length > 0) {
      $availableModels.set(models);
      
      // If current selected model is not available, select the first one
      const currentModel = $selectedLanguageModel.get();
      const isCurrentModelAvailable = models.some(model => model.id === currentModel);
      if (!isCurrentModelAvailable) {
        $selectedLanguageModel.set(models[0].id as any);
      }
    }
    
    // Update image models if we have any
    if (imageModels.length > 0) {
      $availableImageModels.set(imageModels);
      
      // If current selected image model is not available, select the first one
      const currentImageModel = $selectedImageModel.get();
      const isCurrentImageModelAvailable = imageModels.some(model => model.id === currentImageModel);
      if (!isCurrentImageModelAvailable) {
        $selectedImageModel.set(imageModels[0].id as any);
      }
    }
    
    // Update validation states and errors
    $isValidatedOpenai.set(openaiValidated);
    $isValidatedOpenrouter.set(openrouterValidated);
    $openaiError.set(openaiError);
    $openrouterError.set(openrouterError);
    
  } catch (error: any) {
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
