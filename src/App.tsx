import { AppRouter } from './router'
import { InstallPwaPrompt } from './components/pwa/InstallPwaPrompt'

export default function App() {
  return (
    <>
      <AppRouter />
      <InstallPwaPrompt />
    </>
  )
}
