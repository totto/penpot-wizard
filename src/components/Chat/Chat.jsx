import styles from './Chat.module.css'
import Header from './Header/Header'
import ChatMessages from './ChatMessages/ChatMessages'
import Footer from './Footer/Footer'

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
