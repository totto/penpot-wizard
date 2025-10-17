import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.jsx'
// Import the store to initialize it
import './stores/penpotStore'
import { initializeDirectorAgents } from '@/stores/directorAgentsStore'
import { initializeTools } from '@/stores/toolsStore'
import { initializeSpecializedAgents } from '@/stores/specializedAgentsStore'
import { initializeImageGenerationAgents } from '@/stores/imageGenerationAgentsStore'
import { $selectedLanguageModel, $selectedImageModel, $isConnected } from '@/stores/settingsStore'

// Set up subscriptions for tools and director agents initialization
$isConnected.subscribe(async (newValue) => {
  if (newValue) {
    // Initialize tools first, then image generation agents, then specialized agents, then director agents
    await initializeTools()
    await initializeImageGenerationAgents()
    await initializeSpecializedAgents()
    initializeDirectorAgents();
    
    $selectedLanguageModel.subscribe((newValue, oldValue) => {
      if (newValue !== oldValue) {
        initializeSpecializedAgents();
        initializeDirectorAgents();
      }
    });
    
    $selectedImageModel.subscribe((newValue, oldValue) => {
      if (newValue !== oldValue) {
        initializeImageGenerationAgents();
        initializeDirectorAgents();
      }
    });
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
