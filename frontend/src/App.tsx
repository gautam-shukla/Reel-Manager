import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from 'contexts/AppContext'
import { ContextMenuProvider } from 'contexts/ContextMenuContext'
import ContextMenu from 'components/ContextMenu'
import Layout from 'components/Layout'
import Login from 'pages/Login'
import ResetPassword from 'pages/ResetPassword'
import PrivacyPolicy from 'pages/PrivacyPolicy'
import Dashboard from 'pages/Dashboard'
import Folder from 'pages/Folder'
import RecycleBin from 'pages/RecycleBin'
import { ROUTES } from 'constants/routes'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface RouteProps {
  children: React.ReactNode
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Reel Manager UI Error]', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-base)] text-[var(--text-primary)] text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred while loading the application.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/login'
              }}
              className="btn-ghost"
            >
              Clear Cache & Re-login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin mb-4" />
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-mono">Loading Reel Manager...</span>
    </div>
  )
}

function ProtectedRoute({ children }: RouteProps) {
  const { user, loading } = useApp()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: RouteProps) {
  const { user, loading } = useApp()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}

function AppContent() {
  return (
    <Routes>
      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.RESET_PASSWORD}
        element={<ResetPassword />}
      />
      <Route
        path={ROUTES.PRIVACY_POLICY}
        element={<PrivacyPolicy />}
      />
      <Route
        path={ROUTES.ROOT}
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.FOLDER} element={<Folder />} />
        <Route path={ROUTES.RECYCLE_BIN} element={<RecycleBin />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ContextMenuProvider>
            <div className="relative min-h-screen">
              <AppContent />
              <ContextMenu />
            </div>
          </ContextMenuProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
