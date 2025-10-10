import './App.css'
import LeftSidebar from './components/LeftSidebar/LeftSidebar'
import Chat from './components/Chat/Chat'
import { usePenpotStore } from './stores/penpotStore'

function App() {
  const { penpotTheme } = usePenpotStore();

  return (
    <div className="app" data-theme={penpotTheme}>
      <LeftSidebar />
      <Chat />
    </div>
  )
}

export default App
