import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { BookOpen, ArrowLeft } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.senha !== form.confirmar) {
      toast.error('As senhas não coincidem')
      return
    }
    if (form.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/cadastro', {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
      })
      toast.success('Conta criada! Verifique seu e-mail para confirmar.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conta')
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

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lexiona-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-lexiona-900">Lexiona</h1>
          <p className="text-lexiona-600 mt-1">Comece a planejar melhor hoje</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-lexiona-100 p-8">
          <h2 className="text-xl font-display font-semibold text-lexiona-900 mb-6">Criar conta gratuita</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Seu nome', name: 'nome',      type: 'text',     placeholder: 'Prof. Maria Silva' },
              { label: 'E-mail',   name: 'email',     type: 'email',    placeholder: 'seu@email.com' },
              { label: 'Senha',    name: 'senha',     type: 'password', placeholder: '••••••••' },
              { label: 'Confirmar senha', name: 'confirmar', type: 'password', placeholder: '••••••••' },
            ].map(({ label, name, type, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-lexiona-700 mb-1">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm transition"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-60 shadow-sm mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-lexiona-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-lexiona-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}