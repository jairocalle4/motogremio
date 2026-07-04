import { useState, useEffect } from 'react'
import { AppRouter } from './router'
import { InstallPwaPrompt } from './components/pwa/InstallPwaPrompt'
import { OfflineScreen } from './components/pwa/OfflineScreen'

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <>
      {isOffline ? (
        <OfflineScreen onRetry={() => setIsOffline(!navigator.onLine)} />
      ) : (
        <>
          <AppRouter />
          <InstallPwaPrompt />
        </>
      )}
    </>
  )
}
