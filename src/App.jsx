import './App.css'
import LeftSidebar from './components/LeftSidebar/LeftSidebar'
import Chat from './components/Chat/Chat'
import { useAtomValue } from 'jotai'
import { penpotThemeAtom } from './stores/penpotStore'

function App() {
  const penpotTheme = useAtomValue(penpotThemeAtom);

  return (
    <div className="app" data-theme={penpotTheme}>
      <LeftSidebar />
      <Chat />
    </div>
  )
}

export default App
