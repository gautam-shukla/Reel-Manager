import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from 'lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { ROUTES } from 'constants/routes'
import { UI } from 'constants/ui'
import { logger } from 'utils/logger'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const navigate = useNavigate()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have an active session (set automatically by Supabase client parsing the URL hash)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    
    // Give it a brief moment for the Supabase SDK to parse the hash and set the session
    const timer = setTimeout(checkSession, 500)
    return () => clearTimeout(timer)
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError(UI.ERRORS.PASSWORD_MISMATCH)
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setMessage(UI.MESSAGES.PASSWORD_UPDATED)
        // Log out the user after reset to force a clean login with new credentials
        await supabase.auth.signOut()
        setTimeout(() => {
          navigate(ROUTES.LOGIN)
        }, 2000)
      }
    } catch (err: any) {
      logger.error('Password reset error:', err)
      setError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-bg-base overflow-hidden px-4">
      {/* Background Radial Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)'
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-[400px] flex flex-col items-center z-10">
        
        {/* Logo block */}
        <div className="text-center mb-8">
          <p className="font-mono text-[13px] tracking-[0.2em] font-medium text-text-secondary uppercase">
            {UI.TITLES.APP_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
            {UI.LABELS.RESET_PASSWORD}
          </h1>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-bg-card border border-border-default rounded-lg p-8 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]">
          {hasSession === null ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin text-text-secondary" size={24} />
            </div>
          ) : hasSession ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
                  {error}
                </div>
              )}
              
              {message && (
                <div className="p-3 text-xs border border-green-500/20 bg-green-500/10 text-green-400 rounded-md">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  {UI.LABELS.NEW_PASSWORD}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={UI.PLACEHOLDERS.PASSWORD_EXP}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 pl-3.5 pr-10 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  {UI.LABELS.CONFIRM_PASSWORD}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={UI.PLACEHOLDERS.CONFIRM_PASSWORD_EXP}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary h-[40px] mt-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  UI.LABELS.UPDATE_PASSWORD
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary mb-6">
                Reset session not found. This link may have expired or is invalid.
              </p>
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="w-full btn-ghost h-[40px] cursor-pointer"
              >
                {UI.LABELS.BACK_TO_SIGN_IN}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-text-muted text-center tracking-wide select-none">
          {UI.LABELS.FOOTER_NOTE}
        </p>
      </div>
    </div>
  )
}
