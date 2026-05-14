import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const prof = await login(email, senha)
      if (!prof.onboarding_concluido) {
        navigate('/onboarding')
      } else {
        navigate('/app')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'E-mail ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexiona-50 to-lexiona-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-enter">
        {/* Voltar para landing */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-lexiona-500 hover:text-lexiona-700 transition">
            <ArrowLeft size={15} /> Voltar ao início
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lexiona-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-lexiona-900">Lexiona</h1>
          <p className="text-lexiona-600 mt-1 font-body">Planejamento pedagógico inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-lexiona-100 p-8">
          <h2 className="text-xl font-display font-semibold text-lexiona-900 mb-6">Entrar na plataforma</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 font-body text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 font-body text-sm transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lexiona-400 hover:text-lexiona-700"
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-60 shadow-sm mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-lexiona-500 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-lexiona-600 font-medium hover:underline">
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}