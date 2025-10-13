import Header from './Header/Header'
import ChatMessages from './ChatMessages/ChatMessages'
import Footer from './Footer/Footer'
import StartPage from './StartPage/StartPage'
import { $activeConversation } from '@/stores/conversationsStore'
import { useStore } from '@nanostores/react'
import styles from './Chat.module.css'

function Chat() {
  const activeConversation = useStore($activeConversation)

  return (
    <div className={styles.chat}>
      <Header />
      {!activeConversation ? (
          <StartPage />
        ) : (
          <ChatMessages />
        )
      }
    <Footer />
    </div>
  )
}

export default Chat
