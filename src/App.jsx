import './App.css'
import LeftSidebar from '@/components/LeftSidebar/LeftSidebar'
import Chat from '@/components/Chat/Chat'
import ChatV2 from '@/components/Chat/ChatV2'
import VersionSwitcher from '@/components/VersionSwitcher/VersionSwitcher'
import { useStore } from '@nanostores/react'
import { $penpotTheme } from '@/stores/penpotStore'
import { $chatVersion } from '@/stores/appConfigStore'

function App() {
  const penpotTheme = useStore($penpotTheme);
  const chatVersion = useStore($chatVersion);

  return (
    <div className="app" data-theme={penpotTheme}>
      {/* Version switcher - visible only in development mode */}
      {import.meta.env.DEV && <VersionSwitcher />}
      
      <LeftSidebar />
      
      {/* Conditional rendering based on version */}
      {chatVersion === 'v1' ? <Chat /> : <ChatV2 />}
    </div>
  )
}

export default App
