
interface OfflineScreenProps {
  onRetry?: () => void
}

export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-50 text-slate-800 p-5">
      <div className="bg-white p-10 px-8 rounded-2xl shadow-2xl border border-slate-200 max-w-[420px] w-full text-center">
        <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m19 19-3.5-3.5"/>
            <path d="M5 21a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3"/>
            <line x1="2" x2="22" y1="13" y2="13"/>
            <line x1="12" x2="12" y1="9" y2="21"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1E3A5F] mb-3">Sin conexión</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          MotoGremio necesita internet para sincronizar datos de compañías, documentos, cobros y reportes.
          <br />
          Revisa tu conexión e intenta nuevamente.
        </p>
        <button 
          onClick={handleRetry} 
          className="w-full py-3 bg-[#1E3A5F] hover:bg-[#152a45] text-white font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Reintentar conexión
        </button>
      </div>
    </div>
  )
}
