import styles from '@/components/Chat/Chat.module.css'
import Header from '@/components/Chat/Header/Header'
import ChatMessages from '@/components/Chat/ChatMessages/ChatMessages'
import Footer from '@/components/Chat/Footer/Footer'

function Chat() {
  return (
    <div className={styles.chat}>
      <Header />
      <ChatMessages />
      <Footer />
    </div>
  )
}

export default Chat
