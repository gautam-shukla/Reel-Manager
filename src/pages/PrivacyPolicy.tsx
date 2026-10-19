import { useNavigate } from 'react-router-dom'
import { useApp } from 'contexts/AppContext'
import { ROUTES } from 'constants/routes'
import { ArrowLeft, Shield, Database, Lock, Clock, Globe, Eye, Mail, Heart } from 'lucide-react'

export default function PrivacyPolicy() {
  const { user } = useApp()
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else if (user) {
      navigate(ROUTES.DASHBOARD)
    } else {
      navigate(ROUTES.LOGIN)
    }
  }

  const sections = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: '1. Overview & Scope',
      content: (
        <p>
          Reel Manager is a high-performance, monochromatic dashboard engineered to save, organize, and browse Instagram Reel links inside a visual card-and-folder directory. This Privacy Policy details our commitment to securing your personal information, explaining what data is gathered, how it is isolated, and the privacy controls at your disposal.
        </p>
      )
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: '2. Data Collection & Processing',
      content: (
        <div className="space-y-3">
          <p>
            To deliver the core experience of storing and organizing your collections, we collect and store:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>
              <strong className="text-text-primary font-medium">Account Details:</strong> Your username, email address, password, and optional avatar images. Account security and login procedures are managed using industry-standard cryptography.
            </li>
            <li>
              <strong className="text-text-primary font-medium">Reel Collections:</strong> The Instagram Reel URLs you save, the folder/subfolder structures you build, and the text notes or annotations you append.
            </li>
            <li>
              <strong className="text-text-primary font-medium">Thumbnails & Metadata:</strong> Metadata including Instagram author usernames, and images retrieved via API calls or local caching proxies used to render 9:16 portrait cards.
            </li>
          </ul>
        </div>
      )
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: '3. Data Isolation & Row Level Security (RLS)',
      content: (
        <p>
          Security is built directly into our database architecture. Reel Manager uses strict PostgreSQL <strong className="text-text-primary font-medium">Row Level Security (RLS) policies</strong>. This means your dashboard data is entirely isolated: only your authenticated user session holds the cryptographic keys to read, write, update, or delete records associated with your account.
        </p>
      )
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: '4. Security & Automated Expirations',
      content: (
        <div className="space-y-2">
          <p>
            We implement automated guardrails to ensure your session remains secure:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li>
              <strong className="text-text-primary font-medium">6-Hour Session Expiry:</strong> User sessions are automatically scanned and invalidated after 6 hours of continuous login to protect your account against unauthorized physical access.
            </li>
            <li>
              <strong className="text-text-primary font-medium">7-Day Recycle Bin:</strong> Deleted folders and reels are placed in a soft-deleted status inside the Recycle Bin. These entries are automatically purged from the database after exactly 7 days.
            </li>
          </ul>
        </div>
      )
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: '5. Third-Party Integrations',
      content: (
        <div className="space-y-2">
          <p>
            Reel Manager interacts with third-party service providers to handle authentication, database tables, and image fetching:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li>
              <strong className="text-text-primary font-medium">Supabase:</strong> Serves as our primary database backend and auth handler. Passwords are salted and hashed on their servers; we have no access to raw text passwords.
            </li>
            <li>
              <strong className="text-text-primary font-medium">Instagram / Meta APIs:</strong> When you provide an Instagram Reel link, public oEmbed APIs may be consulted to gather default author names and image URLs.
            </li>
            <li>
              <strong className="text-text-primary font-medium">Unsplash:</strong> Curated design graphics are used as fallback image cards if an Instagram preview is blocked or unavailable.
            </li>
          </ul>
        </div>
      )
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: '6. Cookies & Local Storage',
      content: (
        <p>
          We do not use tracking or advertising cookies. Reel Manager uses browser local storage and cookie sessions solely to remember your logged-in session state and to persist your dark/light theme preference.
        </p>
      )
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: '7. Data Ownership & Contact',
      content: (
        <p>
          You retain complete ownership over your dashboard and saved URLs. You can edit your notes, change your username, or delete any record at any time. For questions regarding this policy, or to request permanent account deletion, please contact your instance administrator or refer to your local deployment repository.
        </p>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-bg-base text-text-primary relative overflow-x-hidden">
      {/* Background Radial Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] pointer-events-none opacity-40 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)'
        }}
      />

      {/* Header Container */}
      <header className="sticky top-0 z-50 h-[64px] border-b border-border-default/80 bg-bg-base/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer bg-bg-elevated border border-border-default hover:border-text-secondary/30 rounded-md py-1.5 px-3"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
        <div className="font-mono text-xs tracking-[0.2em] text-text-muted font-bold uppercase select-none">
          REEL MANAGER
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto py-16 px-6 md:px-8">
        
        {/* Title Hero */}
        <div className="text-center mb-16">
          <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-border-default flex items-center justify-center mx-auto mb-6 text-text-primary shadow-sm">
            <Shield size={22} className="text-text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-text-secondary font-mono tracking-wide">
            Last Updated: July 3, 2026
          </p>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className="bg-bg-card border border-border-default hover:border-border-default/90 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-border-default flex items-center justify-center text-text-primary shrink-0 shadow-sm select-none">
                {section.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-text-primary mb-3 select-none">
                  {section.title}
                </h2>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-16 pt-8 border-t border-border-default/50 text-center select-none">
          <p className="text-[11px] text-text-muted flex items-center justify-center gap-1">
            Built with <Heart size={10} className="text-destructive inline" /> for privacy-first developers.
          </p>
        </div>
      </main>
    </div>
  )
}
