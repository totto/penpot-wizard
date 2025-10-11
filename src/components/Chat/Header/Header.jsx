import styles from '@/components/Chat/Header/Header.module.css'

function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>AI Agent Chat</h1>
      <div className={styles.subtitle}>Powered by React 19.2 + Zustand</div>
    </header>
  )
}

export default Header
