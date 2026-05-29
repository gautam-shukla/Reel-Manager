import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from 'contexts/AppContext'
import { ContextMenuProvider } from 'contexts/ContextMenuContext'
import ContextMenu from 'components/ContextMenu'
import Layout from 'components/Layout'
import Login from 'pages/Login'
import Dashboard from 'pages/Dashboard'
import Folder from 'pages/Folder'
import RecycleBin from 'pages/RecycleBin'
import { ROUTES } from 'constants/routes'

interface RouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: RouteProps) {
  const { user, loading } = useApp()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: RouteProps) {
  const { user, loading } = useApp()

  if (loading) {
    return null
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
  )
}
