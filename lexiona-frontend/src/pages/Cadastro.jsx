import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import { Leaf, Eye, EyeOff } from 'lucide-react'

export default function Cadastro() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCadastro(e) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Informe seu nome.'); return }
    if (!email) { toast.error('Informe seu e-mail.'); return }
    if (senha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    try {
      const res = await api.post('/auth/cadastro', { nome: nome.trim(), email, senha })
      localStorage.setItem('lexiona_token', res.data.access_token)
      localStorage.setItem('lexiona_professor', JSON.stringify(res.data.professor))
      toast.success('Conta criada! Vamos configurar seu espaço.')
      navigate('/onboarding')
    } catch (err) {
      toastErro(err, 'Erro ao criar conta. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-10">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-10 group">
        <div className="w-9 h-9 bg-lexiona-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-lexiona-700 transition">
          <Leaf size={18} className="text-white" />
        </div>
        <span className="font-display font-bold text-lexiona-900 text-xl">Lexiona</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-lexiona-100 shadow-card p-8 space-y-6">

        <div>
          <h1 className="font-display text-2xl font-bold text-lexiona-900">Criar conta</h1>
          <p className="text-sm text-lexiona-400 mt-1">Gratuito, sem cartão de crédito</p>
        </div>

        <form onSubmit={handleCadastro} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white transition"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lexiona-400 hover:text-lexiona-700 transition p-1"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 shadow-sm"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Criar conta grátis'}
          </button>

        </form>

        <p className="text-center text-sm text-lexiona-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-lexiona-600 font-semibold hover:text-lexiona-800 underline underline-offset-2">
            Entrar
          </Link>
        </p>

      </div>

      <p className="mt-8 text-xs text-lexiona-400">
        <Link to="/" className="hover:text-lexiona-600 underline underline-offset-2">← Voltar à página inicial</Link>
      </p>
    </div>
  )
}
