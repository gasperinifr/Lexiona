import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Calendario from './pages/Calendario'
import Disciplinas from './pages/Disciplinas'
import Layout from './components/Layout'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lexiona-600" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RotaPublica({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Register /></RotaPublica>} />
      <Route path="/onboarding" element={<RotaProtegida><Onboarding /></RotaProtegida>} />
      <Route element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/disciplinas" element={<Disciplinas />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}