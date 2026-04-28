import { useState } from "react"
import AuthPage from "@/pages/AuthPage"
import DexPage from "@/pages/DexPage"
import { getSession, saveSession, clearSession, type Collector, type Session } from "@/lib/storage"

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getSession())

  function handleAuth(collector: Collector) {
    const s = saveSession(collector)
    setSession(s)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  if (!session) {
    return <AuthPage onAuth={handleAuth} />
  }

  return <DexPage session={session} onLogout={handleLogout} />
}
