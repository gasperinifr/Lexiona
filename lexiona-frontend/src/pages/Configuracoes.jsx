import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import {
  User, Calendar, Bell, Shield, Leaf,
  CheckCircle2, AlertCircle, RefreshCw, Unlink,
} from 'lucide-react'
import GoogleCalendarSync from '../components/GoogleCalendarSync'

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-lexiona-50 flex items-center gap-3">
        <div className="w-9 h-9 bg-lexiona-50 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-lexiona-600" />
        </div>
        <h2 className="font-display font-bold text-lexiona-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function Configuracoes() {
  const [searchParams] = useSearchParams()
  const [professor, setProfessor] = useState(
    JSON.parse(localStorage.getItem('lexiona_professor') || '{}')
  )
  const [nome, setNome] = useState(professor.nome || '')
  const [savingPerfil, setSavingPerfil] = useState(false)

  // Feedback do OAuth Google
  useEffect(() => {
    const google = searchParams.get('google')
    if (google === 'success') {
      toast.success('Google Calendar conectado com sucesso!')
      window.history.replaceState({}, '', '/app/configuracoes')
    } else if (google === 'error') {
      const reason = searchParams.get('reason') || 'desconhecido'
      toast.error(`Falha ao conectar Google Calendar: ${reason}`)
      window.history.replaceState({}, '', '/app/configuracoes')
    }
  }, [searchParams])

  async function handleSalvarPerfil() {
    if (!nome.trim()) { toast.error('Informe seu nome.'); return }
    setSavingPerfil(true)
    try {
      const res = await api.put('/auth/perfil', { nome: nome.trim() })
      const updated = { ...professor, nome: nome.trim() }
      localStorage.setItem('lexiona_professor', JSON.stringify(updated))
      setProfessor(updated)
      toast.success('Perfil atualizado!')
    } catch (err) {
      toastErro(err, 'Erro ao atualizar perfil.')
    } finally {
      setSavingPerfil(false)
    }
  }

  const initials = professor.nome
    ? professor.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'P'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-lexiona-900">Configurações</h1>
        <p className="text-sm text-lexiona-400 mt-0.5">Gerencie seu perfil e integrações</p>
      </div>

      {/* Perfil */}
      <SectionCard title="Perfil" icon={User}>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lexiona-500 to-lexiona-700 flex items-center justify-center text-white text-2xl font-bold shadow-card flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-lexiona-900">{professor.nome}</p>
            <p className="text-sm text-lexiona-400">{professor.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Nome</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
            />
          </div>
          <button
            onClick={handleSalvarPerfil}
            disabled={savingPerfil}
            className="bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-60 text-sm flex items-center gap-2"
          >
            {savingPerfil
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Salvar alterações'}
          </button>
        </div>
      </SectionCard>

      {/* Google Calendar */}
      <SectionCard title="Google Calendar" icon={Calendar}>
        <GoogleCalendarSync />
      </SectionCard>

      {/* Sobre */}
      <SectionCard title="Sobre o Lexiona" icon={Leaf}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lexiona-600 rounded-xl flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-lexiona-900">Lexiona</p>
              <p className="text-xs text-lexiona-400">Versão 2.0.0</p>
            </div>
          </div>
          <p className="text-sm text-lexiona-500 leading-relaxed">
            Plataforma de planejamento pedagógico inteligente para docentes.
            Desenvolvida com IA para simplificar e enriquecer o trabalho do professor.
          </p>
        </div>
      </SectionCard>

    </div>
  )
}
