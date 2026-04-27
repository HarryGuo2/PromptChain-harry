'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  const supabase = typeof window !== 'undefined' ? createClient() : null
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const message = params.get('message')
    if (message) setRedirectMessage(message)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email ?? null)
    }
    void run()
  }, [supabase])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    if (!supabase) {
      setIsLoading(false)
      return
    }
    const redirectTo =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000/auth/callback'
        : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setIsLoading(false)
      alert(error.message)
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUserEmail(null)
  }

  return (
    <main className="container">
      <div className="card">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold">Prompt Chain Tool</h1>
        <p className="text-slate-600">
          Build, reorder, and test humor prompt chains.
        </p>
        {redirectMessage ? (
          <div
            role="status"
            className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            {redirectMessage}
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          {!userEmail ? (
            <button className="btn btn-primary" onClick={handleGoogleLogin} disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          ) : (
            <>
              <a className="btn btn-primary" href="/admin">
                Open Admin Tool
              </a>
              <button className="btn" onClick={handleLogout}>
                Sign out ({userEmail})
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
