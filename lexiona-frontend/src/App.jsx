import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Landing Page (eager — primeira impressão)
import LandingPage from './pages/LandingPage'

// App pages (lazy — carregam só quando necessário)
const Login = lazy(() => import('./pages/Login'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Disciplinas = lazy(() => import('./pages/Disciplinas'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('lexiona_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-lexiona-200 border-t-lexiona-600 rounded-full animate-spin" />
        <p className="text-sm text-lexiona-500 font-medium">Carregando...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Público */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* Onboarding protegido (sem layout) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* App protegido com layout */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="disciplinas" element={<Disciplinas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
