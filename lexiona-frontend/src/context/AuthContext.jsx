import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [professor, setProfessor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('lexiona_token')
    const savedProfessor = localStorage.getItem('lexiona_professor')

    if (token && savedProfessor) {
      setUser({ token })
      setProfessor(JSON.parse(savedProfessor))
    }
    setLoading(false)
  }, [])

  const login = async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha })
    const { access_token, professor: prof } = response.data

    localStorage.setItem('lexiona_token', access_token)
    localStorage.setItem('lexiona_professor', JSON.stringify(prof))

    setUser({ token: access_token })
    setProfessor(prof)

    return prof
  }

  const logout = () => {
    localStorage.removeItem('lexiona_token')
    localStorage.removeItem('lexiona_professor')
    setUser(null)
    setProfessor(null)
  }

  const updateProfessor = (dados) => {
    const updated = { ...professor, ...dados }
    setProfessor(updated)
    localStorage.setItem('lexiona_professor', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ user, professor, loading, login, logout, updateProfessor }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}