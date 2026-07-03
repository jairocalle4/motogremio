import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, RefreshCw, X } from 'lucide-react'

export function InstallPwaPrompt() {
  // Service Worker updates
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.error('SW Register Error:', error)
    },
  })

  // Installation prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      
      // Check if user dismissed it recently
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismissInstall = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowInstallBanner(false)
  }

  const handleDismissUpdate = () => {
    setNeedRefresh(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
      {/* Banner de Actualización */}
      {needRefresh && (
        <div className="bg-[#1E3A5F] text-white p-4 rounded-xl shadow-2xl border border-blue-500/20 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
              <div>
                <h4 className="font-semibold text-sm">Nueva versión disponible</h4>
                <p className="text-xs text-blue-200 mt-1">Hay actualizaciones listas para instalar en MotoGremio.</p>
              </div>
            </div>
            <button onClick={handleDismissUpdate} className="text-blue-300 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <button 
              onClick={handleDismissUpdate} 
              className="px-3 py-1.5 rounded-lg text-blue-200 hover:bg-white/10 transition"
            >
              Ahora no
            </button>
            <button 
              onClick={() => updateServiceWorker(true)} 
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-lg transition"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      )}

      {/* Banner de Instalación */}
      {showInstallBanner && deferredPrompt && (
        <div className="bg-white text-slate-900 p-4 rounded-xl shadow-2xl border border-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              <Download className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Instalar MotoGremio</h4>
                <p className="text-xs text-slate-500 mt-1">Instala MotoGremio en tu dispositivo para acceder más rápido desde tu escritorio o pantalla principal.</p>
              </div>
            </div>
            <button onClick={handleDismissInstall} className="text-slate-400 hover:text-slate-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <button 
              onClick={handleDismissInstall} 
              className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition"
            >
              Ahora no
            </button>
            <button 
              onClick={handleInstallClick} 
              className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#152a45] text-white font-bold rounded-lg transition"
            >
              Instalar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
