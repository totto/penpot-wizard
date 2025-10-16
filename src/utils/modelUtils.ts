import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { 
  $selectedLanguageModel, 
  $availableModels, 
  $openaiApiKey, 
  $openrouterApiKey, 
  $isValidatedOpenai, 
  $isValidatedOpenrouter 
} from '../stores/settingsStore';

/**
 * Creates a model instance based on the selected language model from settingsStore
 * @returns The configured model instance
 * @throws Error if API key is not available or provider is not supported
 */
export function createModelInstance() {
  const selectedLanguageModel = $selectedLanguageModel.get();
  const availableModels = $availableModels.get();
  const openaiApiKey = $openaiApiKey.get();
  const openrouterApiKey = $openrouterApiKey.get();
  const isValidatedOpenai = $isValidatedOpenai.get();
  const isValidatedOpenrouter = $isValidatedOpenrouter.get();
  
  // Find the selected model in available models to get the provider
  const selectedModel = availableModels.find(model => model.id === selectedLanguageModel);
  
  if (!selectedModel) {
    throw new Error(`Selected model '${selectedLanguageModel}' not found in available models`);
  }
  
  // Determine provider and create model instance
  switch (selectedModel.provider) {
    case 'openai':
      if (!openaiApiKey || !isValidatedOpenai) {
        throw new Error('OpenAI API key not available or not validated');
      }
      const openai = createOpenAI({
        apiKey: openaiApiKey,
      });

      return openai(selectedLanguageModel);
      
    case 'openrouter':
      if (!openrouterApiKey || !isValidatedOpenrouter) {
        throw new Error('OpenRouter API key not available or not validated');
      }
      const openrouter = createOpenRouter({
        apiKey: openrouterApiKey,
      });

      return openrouter(selectedLanguageModel);
      
    default:
      throw new Error(`Unsupported provider: ${selectedModel.provider}`);
  }
}
