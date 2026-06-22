import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateColorShades } from '@/lib/colors'
import { useAuth } from '@/context/useAuth'

// ─── Tipos ────────────────────────────────────────────
interface BrandingData {
  primary_color: string | null
  secondary_color: string | null
  commercial_name: string | null
  slogan: string | null
  logo_url: string | null
}

interface BrandingContextValue {
  branding: BrandingData | null
  loading: boolean
  reload: () => Promise<void>
}

// ─── Contexto ─────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  loading: false,
  reload: async () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export function useBranding() {
  return useContext(BrandingContext)
}

// ─── Provider ─────────────────────────────────────────
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [branding, setBranding] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBranding = async () => {
    if (!profile?.company_id || profile.role === 'super_admin') {
      setBranding(null)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_my_company_branding')
      if (!error && data) {
        setBranding(data as unknown as BrandingData)
      }
    } catch {
      // silencioso — la app sigue funcionando con colores por defecto
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id])

  // Inyectar CSS variables cuando cambia el color primario
  useEffect(() => {
    const color = branding?.primary_color
    if (!color) return

    const shades = generateColorShades(color)
    const style = document.createElement('style')
    style.id = 'branding-css-vars'
    style.textContent = `:root {\n${Object.entries(shades)
      .map(([shade, rgb]) => `  --color-primary-${shade}: ${rgb.join(' ')};`)
      .join('\n')}\n}`

    // Eliminar el anterior si existe
    document.getElementById('branding-css-vars')?.remove()
    document.head.appendChild(style)

    return () => {
      document.getElementById('branding-css-vars')?.remove()
    }
  }, [branding?.primary_color])

  return (
    <BrandingContext.Provider value={{ branding, loading, reload: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}
