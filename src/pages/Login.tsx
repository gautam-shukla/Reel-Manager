import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from 'lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { ROUTES } from 'constants/routes'
import { UI } from 'constants/ui'
import { logger } from 'utils/logger'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const navigate = useNavigate()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0]
            }
          }
        })

        if (signUpError) {
          setError(signUpError.message)
        } else {
          setMessage(UI.MESSAGES.SIGN_UP_SUCCESS)
          setIsSignUp(false)
        }
      } else {
        // Sign In Flow
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) {
          setError(signInError.message)
        } else {
          navigate(ROUTES.DASHBOARD)
        }
      }
    } catch (err: any) {
      logger.error('Authentication error:', err)
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
            {UI.TITLES.SUBTITLE}
          </h1>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-bg-card border border-border-default rounded-lg p-8 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]">
          <form onSubmit={handleAuth} className="space-y-5">
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

            {isSignUp && (
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  {UI.LABELS.USERNAME}
                </label>
                <input
                  type="text"
                  placeholder={UI.PLACEHOLDERS.USERNAME_EXP}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                {UI.LABELS.EMAIL}
              </label>
              <input
                type="email"
                placeholder={UI.PLACEHOLDERS.EMAIL_EXP}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase">
                  {UI.LABELS.PASSWORD}
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setMessage(UI.ERRORS.PASSWORD_RESET_NOT_CONFIGURED)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {UI.LABELS.FORGOT_PASSWORD}
                  </button>
                )}
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-[40px] mt-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : isSignUp ? (
                UI.LABELS.CREATE_ACCOUNT
              ) : (
                UI.LABELS.SIGN_IN
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-text-muted py-2 select-none">
              <div className="h-[1px] bg-border-default flex-1" />
              <span className="px-3">{UI.LABELS.OR}</span>
              <div className="h-[1px] bg-border-default flex-1" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="w-full btn-ghost h-[40px] cursor-pointer"
            >
              {isSignUp ? UI.LABELS.BACK_TO_SIGN_IN : UI.LABELS.CREATE_AN_ACCOUNT}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-text-muted text-center tracking-wide select-none">
          {UI.LABELS.FOOTER_NOTE}
        </p>
      </div>
    </div>
  )
}
