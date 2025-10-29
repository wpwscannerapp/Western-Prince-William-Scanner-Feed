'use client'
import { createContext, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export const AuthContext = createContext<ReturnType<typeof createClientComponentClient> | undefined>(undefined)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // NO AUTO-REFRESH - manual only
      // Session data can be accessed here if needed, but no automatic state updates
    })
  }, [supabase]) // Depend on supabase to re-run if client changes (though it shouldn't)
  
  return <AuthContext.Provider value={supabase}>{children}</AuthContext.Provider>
}