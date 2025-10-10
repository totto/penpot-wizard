import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import OpenAI from 'openai';
import { openrouter } from '@openrouter/ai-sdk-provider';

export interface LanguageModel {
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
const openaiApiKeyAtom = atomWithStorage<string>('openaiApiKey', '');
const openrouterApiKeyAtom = atomWithStorage<string>('openrouterApiKey', '');
const selectedLanguageModelAtom = atomWithStorage<string>('selectedLanguageModel', '');
const availableModelsAtom = atomWithStorage<LanguageModel[]>('availableModels', []);
const isValidatedOpenaiAtom = atomWithStorage<boolean>('isValidatedOpenai', false);
const isValidatedOpenrouterAtom = atomWithStorage<boolean>('isValidatedOpenrouter', false);
const lastFetchTimeAtom = atomWithStorage<number | null>('lastFetchTime', null);

// Runtime atoms (not persisted)
const isLoadingModelsAtom = atom<boolean>(false);
const openaiErrorAtom = atom<string | null>(null);
const openrouterErrorAtom = atom<string | null>(null);

// Derived atoms
export const isConnectedAtom = atom((get) => {
  return get(openaiApiKeyAtom) !== '' 
  && get(isValidatedOpenaiAtom) 
  && get(availableModelsAtom).some(model => model.id === get(selectedLanguageModelAtom));
});

// Action atoms
export const setOpenaiApiKeyAtom = atom(
  null,
  (get, set, key: string) => {
    set(openaiApiKeyAtom, key);
    set(isValidatedOpenaiAtom, false);
    set(openaiErrorAtom, null);
  }
);

export const setOpenrouterApiKeyAtom = atom(
  null,
  (get, set, key: string) => {
    set(openrouterApiKeyAtom, key);
    set(isValidatedOpenrouterAtom, false);
    set(openrouterErrorAtom, null);
  }
);

export const setSelectedLanguageModelAtom = atom(
  null,
  (get, set, model: string) => {
    set(selectedLanguageModelAtom, model);
  }
);

export const clearErrorsAtom = atom(
  null,
  (get, set) => {
    set(openaiErrorAtom, null);
    set(openrouterErrorAtom, null);
  }
);

// Async action atom for fetching models
export const fetchModelsAtom = atom(
  null,
  async (get, set) => {
    const openaiApiKey = get(openaiApiKeyAtom);
    const openrouterApiKey = get(openrouterApiKeyAtom);
    
    let models: LanguageModel[] = [];
    let openaiValidated = false;
    let openrouterValidated = false;
    let openaiError: string | null = null;
    let openrouterError: string | null = null;
    
    set(isLoadingModelsAtom, true);
    set(openaiErrorAtom, null);
    set(openrouterErrorAtom, null);
    
    try {
      // Validate OpenAI API key and add supported models
      if (openaiApiKey?.trim()) {
        try {
          const openaiClient = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
          
          // Test API key validity by making a simple request
          await openaiClient.models.list();
          
          // If successful, add our curated list of supported models
          models = [...models, ...OPENAI_SUPPORTED_MODELS];
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
            
            models = [...models, ...openrouterModelList];
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
        set(availableModelsAtom, models);
        
        // If current selected model is not available, select the first one
        const currentModel = get(selectedLanguageModelAtom);
        const isCurrentModelAvailable = models.some(model => model.id === currentModel);
        if (!isCurrentModelAvailable) {
          set(selectedLanguageModelAtom, models[0].id);
        }
      }
      
      // Update validation states and errors
      set(isValidatedOpenaiAtom, openaiValidated);
      set(isValidatedOpenrouterAtom, openrouterValidated);
      set(openaiErrorAtom, openaiError);
      set(openrouterErrorAtom, openrouterError);
      
    } catch (error: any) {
      console.error('Error fetching models:', error);
    } finally {
      set(isLoadingModelsAtom, false);
      set(lastFetchTimeAtom, Date.now());
    }
  }
);

// Check API keys action
export const checkApiKeysAtom = atom(
  null,
  async (get, set) => {
    const openaiApiKey = get(openaiApiKeyAtom);
    const openrouterApiKey = get(openrouterApiKeyAtom);
    
    // Only proceed if at least one API key is provided
    if (!openaiApiKey?.trim() && !openrouterApiKey?.trim()) {
      console.warn('No API keys provided');
      return;
    }
    
    // Call the fetchModels action directly
    await set(fetchModelsAtom);
  }
);

// Export all atoms for use in components
export {
  openaiApiKeyAtom,
  openrouterApiKeyAtom,
  selectedLanguageModelAtom,
  availableModelsAtom,
  isLoadingModelsAtom,
  lastFetchTimeAtom,
  isValidatedOpenaiAtom,
  isValidatedOpenrouterAtom,
  openaiErrorAtom,
  openrouterErrorAtom,
};
