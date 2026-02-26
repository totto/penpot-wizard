import './App.css'
import LeftSidebar from '@/components/LeftSidebar/LeftSidebar'
import Chat from '@/components/Chat/Chat'
import { useStore } from '@nanostores/react'
import { $penpotTheme } from '@/stores/penpotStore'
import { Analytics } from '@vercel/analytics/react'

function App() {
  const penpotTheme = useStore($penpotTheme);

  return (
    <div className="app" data-theme={penpotTheme}>
      <LeftSidebar />
      <Chat />
      <Analytics />
    </div>
  )
}

export default App
