import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
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

export interface SettingsState {
  openaiApiKey: string;
  openrouterApiKey: string;
  selectedLanguageModel: string;
  availableModels: LanguageModel[];
  isLoadingModels: boolean;
  lastFetchTime: number | null;
  isValidatedOpenai: boolean;
  isValidatedOpenrouter: boolean;
  openaiError: string | null;
  openrouterError: string | null;
  setOpenaiApiKey: (key: string) => void;
  setOpenrouterApiKey: (key: string) => void;
  setSelectedLanguageModel: (model: string) => void;
  setAvailableModels: (models: LanguageModel[]) => void;
  fetchModels: () => Promise<void>;
  checkApiKeys: () => Promise<void>;
  clearErrors: () => void;
  getIsConnected: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    subscribeWithSelector(
    (set, get) => ({
      openaiApiKey: '',
      openrouterApiKey: '',
      selectedLanguageModel: 'gpt-4o',
      availableModels: [],
      isLoadingModels: false,
      lastFetchTime: null,
      isValidatedOpenai: false,
      isValidatedOpenrouter: false,
      openaiError: null,
      openrouterError: null,
      
      setOpenaiApiKey: (key: string) => {
        set({ 
          openaiApiKey: key,
          isValidatedOpenai: false,
          openaiError: null
        });
      },
      
      setOpenrouterApiKey: (key: string) => {
        set({ 
          openrouterApiKey: key,
          isValidatedOpenrouter: false,
          openrouterError: null
        });
      },
      
      setSelectedLanguageModel: (model: string) => {
        set({ selectedLanguageModel: model });
      },
      
      setAvailableModels: (models: LanguageModel[]) => {
        set({ availableModels: models });
      },
      
      fetchModels: async () => {
        const { openaiApiKey, openrouterApiKey } = get();
        let models: LanguageModel[] = [];
        let openaiValidated = false;
        let openrouterValidated = false;
        let openaiError: string | null = null;
        let openrouterError: string | null = null;
        
        set({ isLoadingModels: true, openaiError: null, openrouterError: null });
        
        try {
          // Validate OpenAI API key and add supported models
          if (openaiApiKey?.trim()) {
            try {
              const openaiClient = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
              
              // Test API key validity by making a simple request
              // We'll try to get models list but only use it to validate the key
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
              // Fetch models from OpenRouter API directly
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
                  .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for better UX
                
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
            set({ availableModels: models });
            
            // If current selected model is not available, select the first one
            const { selectedLanguageModel } = get();
            const isCurrentModelAvailable = models.some(model => model.id === selectedLanguageModel);
            if (!isCurrentModelAvailable) {
              set({ selectedLanguageModel: models[0].id });
            }
          }
          
          // Update validation states and errors
          set({ 
            isValidatedOpenai: openaiValidated,
            isValidatedOpenrouter: openrouterValidated,
            openaiError,
            openrouterError
          });
          
        } catch (error: any) {
          console.error('Error fetching models:', error);
          // Don't set any models on general error
        } finally {
          set({ isLoadingModels: false, lastFetchTime: Date.now() });
        }
      },
      
      checkApiKeys: async () => {
        const { openaiApiKey, openrouterApiKey } = get();
        
        // Only proceed if at least one API key is provided
        if (!openaiApiKey?.trim() && !openrouterApiKey?.trim()) {
          console.warn('No API keys provided');
          return;
        }
        
        // Call the existing fetchModels method
        await get().fetchModels();
      },
      
      clearErrors: () => {
        set({ openaiError: null, openrouterError: null });
      },
      
      // Computed value: isConnected based on OpenAI validation
      getIsConnected: () => {
        return get().isValidatedOpenai;
      },
    })),
    {
      name: 'ai-agent-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist API keys if they have been validated
        openaiApiKey: state.isValidatedOpenai ? state.openaiApiKey : '',
        openrouterApiKey: state.isValidatedOpenrouter ? state.openrouterApiKey : '',
        selectedLanguageModel: state.selectedLanguageModel,
        isValidatedOpenai: state.isValidatedOpenai,
        isValidatedOpenrouter: state.isValidatedOpenrouter,
        // Persist available models list
        availableModels: state.availableModels,
        // Persist last fetch time
        lastFetchTime: state.lastFetchTime,
      }),
    }
  )
);
