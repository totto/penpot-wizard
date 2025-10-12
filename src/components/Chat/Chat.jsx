import { useEffect } from 'react'
import styles from './Chat.module.css'
import Header from './Header/Header'
import ChatMessages from './ChatMessages/ChatMessages'
import Footer from './Footer/Footer'
import { initializeDirectorAgents } from '@/stores/directorAgentsStore'
import { initializeTools } from '@/stores/toolsStore'
import { $selectedLanguageModel, $isConnected } from '@/stores/settingsStore'

function Chat() {
  useEffect(() => {
    // Set up subscriptions for tools and director agents initialization
    let unsubscribeModel = () => {};

    const unsubscribeConnection = $isConnected.subscribe(async (newValue, oldValue) => {
      console.log('unsubscribeConnection', newValue, oldValue)
      if (newValue) {
        // Initialize tools first, then agents
        await initializeTools()
        initializeDirectorAgents();
       
        unsubscribeModel = $selectedLanguageModel.subscribe((newValue, oldValue) => {
          if (newValue !== oldValue) {
            initializeDirectorAgents();
          }
        });
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeModel();
      unsubscribeConnection();
    };
  }, []);

  return (
    <div className={styles.chat}>
      <Header />
      <ChatMessages />
      <Footer />
    </div>
  )
}

export default Chat
