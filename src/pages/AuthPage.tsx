import { useState } from "react"
import { KeyRound, LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAccount, login, saveSession, type Collector } from "@/lib/storage"

type Mode = "login" | "signup"

interface AuthPageProps {
  onAuth: (collector: Collector) => void
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login")
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPseudo("")
    setPassword("")
    setRepeatPassword("")
  }

  async function submit() {
    const normalizedPseudo = pseudo.trim()
    setError(null)

    if (!normalizedPseudo) {
      setError("Le pseudo est obligatoire.")
      return
    }
    if (password.length < 4) {
      setError("Le mot de passe doit faire au moins 4 caractères.")
      return
    }
    if (mode === "signup" && password !== repeatPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    try {
      const collector =
        mode === "login"
          ? await login(normalizedPseudo, password)
          : await createAccount(normalizedPseudo, password)
      saveSession(collector)
      onAuth(collector)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-svh flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-20 rounded-full border-4 border-[#253b75] bg-[#e33535] shadow-[0_5px_0_#253b75] mb-4">
            <div className="size-10 rounded-full border-4 border-[#253b75] bg-white flex items-center justify-center">
              <div className="size-4 rounded-full bg-[#253b75]" />
            </div>
          </div>
          <h1 className="pokemon-title text-5xl">PocketDex</h1>
          <p className="mt-1 text-sm font-extrabold text-[#52659b]">
            Ton dex, tes amis, vos différences.
          </p>
        </div>

        {/* Card */}
        <div className="pokedex-panel rounded-3xl bg-white overflow-hidden">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 border-b-3 border-[#253b75]">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-black transition-colors ${
                mode === "login"
                  ? "bg-[#ffcb05] text-[#253b75]"
                  : "bg-white text-[#52659b] hover:bg-[#f7fbff]"
              }`}
            >
              <LogIn className="size-4" />
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-black transition-colors border-l-2 border-[#253b75] ${
                mode === "signup"
                  ? "bg-[#ffcb05] text-[#253b75]"
                  : "bg-white text-[#52659b] hover:bg-[#f7fbff]"
              }`}
            >
              <UserPlus className="size-4" />
              Créer un compte
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="font-black text-[#253b75]">Pseudo</Label>
              <Input
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                className="rounded-full border-2 border-[#253b75] bg-[#f7fbff] font-bold focus:bg-white"
                placeholder="Ex: Miguel"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-[#253b75]">Mot de passe</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && mode === "login" && void submit()}
                  className="rounded-full border-2 border-[#253b75] bg-[#f7fbff] font-bold pr-10 focus:bg-white"
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52659b] hover:text-[#253b75]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="font-black text-[#253b75]">Répéter le mot de passe</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  className="rounded-full border-2 border-[#253b75] bg-[#f7fbff] font-bold focus:bg-white"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="rounded-2xl border-2 border-[#e33535] bg-red-50 px-3 py-2 text-sm font-bold text-[#e33535]">
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full rounded-full border-2 border-[#253b75] bg-[#e33535] font-black text-white shadow-[0_3px_0_#253b75] hover:bg-[#c92a2a] active:translate-y-px active:shadow-[0_1px_0_#253b75] transition-all"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="size-4" />
                  Se connecter
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Créer le compte
                </>
              )}
            </Button>

            {mode === "login" && (
              <p className="text-center text-xs font-bold text-[#52659b]">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-[#253b75] underline underline-offset-2 hover:no-underline"
                >
                  Crée-en un
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
