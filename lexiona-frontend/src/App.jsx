import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Calendario from './pages/Calendario'
import Disciplinas from './pages/Disciplinas'
import Layout from './components/Layout'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#f8faf9]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lexiona-600" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RotaPublica({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Landing page — pública */}
      <Route path="/" element={<LandingPage />} />

      {/* Rotas públicas (redireciona para /app se já logado) */}
      <Route path="/login"    element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Register /></RotaPublica>} />

      {/* Onboarding — protegido, fora do layout principal */}
      <Route path="/onboarding" element={<RotaProtegida><Onboarding /></RotaProtegida>} />

      {/* App autenticado — tudo sob /app */}
      <Route path="/app" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="calendario"  element={<Calendario />} />
        <Route path="disciplinas" element={<Disciplinas />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}