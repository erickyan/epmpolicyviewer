import { useState } from "react"
import Header from "./components/Header"
import AuthPage from "./components/AuthPage"
import Landing from "./components/Landing"
import Dashboard from "./components/Dashboard"
import { loadDefaultPolicy, uploadPolicyXml } from "./api"
import { loadAuthSession, type AuthSession } from "./lib/auth"
import type { PolicyDocumentResponse } from "./types"

const App = () => {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())
  const [result, setResult] = useState<PolicyDocumentResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [loadingDefault, setLoadingDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelected = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      setResult(await uploadPolicyXml(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      if (err instanceof Error && err.message.includes("session has expired")) {
        setSession(null)
        setResult(null)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleLoadDefault = async () => {
    setLoadingDefault(true)
    setError(null)
    try {
      setResult(await loadDefaultPolicy())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      if (err instanceof Error && err.message.includes("session has expired")) {
        setSession(null)
        setResult(null)
      }
    } finally {
      setLoadingDefault(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  const handleSignOut = () => {
    setSession(null)
    setResult(null)
    setError(null)
  }

  if (!session) {
    return <AuthPage onAuthenticated={setSession} />
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <Header
        response={result}
        session={session}
        onReset={handleReset}
        onSignOut={handleSignOut}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {result ? (
          <Dashboard response={result} />
        ) : (
          <Landing
            onFileSelected={handleFileSelected}
            onLoadDefault={handleLoadDefault}
            isLoading={isUploading}
            loadingDefault={loadingDefault}
            error={error}
          />
        )}
      </main>
    </div>
  )
}

export default App
