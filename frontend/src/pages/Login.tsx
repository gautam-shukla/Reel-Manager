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
  const [isForgotPassword, setIsForgotPassword] = useState(false)
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
      if (isForgotPassword) {
        // Forgot Password Flow
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`
        })

        if (resetError) {
          setError(resetError.message)
        } else {
          setMessage(UI.MESSAGES.RESET_LINK_SENT)
        }
      } else if (isSignUp) {
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

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${ROUTES.DASHBOARD}`
        }
      })
      if (error) throw error
    } catch (err: any) {
      logger.error('Google Sign-In error:', err)
      setError(err.message || 'Failed to sign in with Google')
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
            {isForgotPassword ? UI.LABELS.FORGOT_PASSWORD_TITLE : isSignUp ? UI.LABELS.CREATE_AN_ACCOUNT : UI.TITLES.SUBTITLE}
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

            {!isForgotPassword && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-bg-elevated hover:bg-border-default/50 text-text-primary border border-border-default rounded-md h-[40px] px-4 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                </button>

                <div className="flex items-center justify-between text-xs text-text-muted select-none">
                  <div className="h-[1px] bg-border-default flex-1" />
                  <span className="px-3 uppercase font-mono tracking-widest text-[10px]">{UI.LABELS.OR}</span>
                  <div className="h-[1px] bg-border-default flex-1" />
                </div>
              </>
            )}

            {isForgotPassword && (
              <p className="text-xs text-text-secondary mb-2 leading-relaxed">
                {UI.LABELS.ENTER_EMAIL_RESET}
              </p>
            )}

            {isSignUp && !isForgotPassword && (
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

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-mono tracking-widest text-text-muted uppercase">
                    {UI.LABELS.PASSWORD}
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true)
                        setError(null)
                        setMessage(null)
                      }}
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
                    required={!isForgotPassword}
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-[40px] mt-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : isForgotPassword ? (
                UI.LABELS.SEND_RESET_LINK
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

            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false)
                  setError(null)
                  setMessage(null)
                }}
                className="w-full btn-ghost h-[40px] cursor-pointer"
              >
                {UI.LABELS.BACK_TO_SIGN_IN}
              </button>
            ) : (
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
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-1.5 select-none">
          <p className="text-[11px] text-text-muted text-center tracking-wide">
            {UI.LABELS.FOOTER_NOTE}
          </p>
          <button
            onClick={() => navigate(ROUTES.PRIVACY_POLICY)}
            className="text-[11px] text-text-muted hover:text-text-secondary hover:underline cursor-pointer bg-transparent border-none p-0 transition-colors font-semibold"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}
