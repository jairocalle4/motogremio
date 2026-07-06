import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/types'

// ─── Tipos del contexto ───────────────────────────────
interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─── Contexto (exportado para useAuth.ts) ────────────
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (event === 'PASSWORD_RECOVERY') {
          // Si es recuperación de contraseña, dejamos que el componente ResetPasswordPage lo maneje.
          // Ponemos el loading en false para permitir renderizar la ruta pública correcta.
          setLoading(false)
          return
        }
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, company:companies(*)')
        .eq('id', userId)
        .single()

      if (error) {
        // La tabla aún no existe (Fase 2 pendiente) — continuar sin perfil
        console.warn('[MotoGremio] Tabla profiles no disponible:', error.message)
        setProfile(null)
      } else {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('[MotoGremio] Error al obtener perfil:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Traducir mensajes comunes de Supabase al español
      const messages: Record<string, string> = {
        'Invalid login credentials':        'Correo o contraseña incorrectos.',
        'Email not confirmed':              'Debes confirmar tu correo electrónico.',
        'Too many requests':               'Demasiados intentos. Espera un momento.',
        'User not found':                  'No existe una cuenta con ese correo.',
      }
      return { error: messages[error.message] ?? 'Error al iniciar sesión. Intenta de nuevo.' }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// useAuth se exporta desde @/context/useAuth.ts
