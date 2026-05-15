import { useState, useEffect } from 'react'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react'

export default function GoogleCalendarSync() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    api.get('/google-calendar/status')
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ conectado: false }))
      .finally(() => setLoading(false))
  }, [])

  async function handleConectar() {
    try {
      const res = await api.get('/google-calendar/auth')
      window.location.href = res.data.auth_url
    } catch (err) {
      toastErro(err, 'Não foi possível iniciar a conexão com o Google.')
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await api.post('/google-calendar/sync', {})
      toast.success(res.data.mensagem)
    } catch (err) {
      toastErro(err, 'Erro ao sincronizar com o Google Calendar.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDesconectar() {
    if (!confirm('Desconectar o Google Calendar? Os eventos já criados não serão removidos.')) return
    setDisconnecting(true)
    try {
      await api.post('/google-calendar/disconnect')
      setStatus({ conectado: false })
      toast.success('Google Calendar desconectado.')
    } catch (err) {
      toastErro(err, 'Erro ao desconectar.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return <div className="h-16 bg-lexiona-50 rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-4">
      {status?.conectado ? (
        <>
          {/* Status conectado */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Conta Google conectada</p>
              <p className="text-xs text-green-600 mt-0.5">
                Suas aulas planejadas podem ser sincronizadas com o Google Calendar.
              </p>
            </div>
          </div>

          <p className="text-xs text-lexiona-400 leading-relaxed">
            A sincronização cria eventos no seu Google Calendar com tema, objetivos e conteúdos de cada aula. Os eventos são coloridos por turno para fácil identificação.
          </p>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-60 text-sm flex-1"
            >
              {syncing
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><RefreshCw size={14} /> Sincronizar agora</>}
            </button>
            <button
              onClick={handleDesconectar}
              disabled={disconnecting}
              className="flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
            >
              <Unlink size={14} /> Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Status desconectado */}
          <div className="flex items-start gap-3 bg-lexiona-50 border border-lexiona-100 rounded-xl px-4 py-4">
            <AlertCircle size={18} className="text-lexiona-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-lexiona-800">Google Calendar não conectado</p>
              <p className="text-xs text-lexiona-500 mt-1 leading-relaxed">
                Conecte sua conta Google para sincronizar suas aulas com o Google Calendar e visualizá-las junto com todos os seus outros compromissos.
              </p>
            </div>
          </div>

          <ul className="space-y-1.5">
            {[
              'Aulas aparecem no Google Calendar com tema e objetivos',
              'Eventos coloridos por turno (matutino, vespertino, noturno)',
              'Visível em outros apps integrados ao Google Calendar',
              'Sincronização sob demanda, sem automatizar',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-lexiona-500">
                <CheckCircle2 size={13} className="text-lexiona-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={handleConectar}
            className="flex items-center justify-center gap-2 w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            <ExternalLink size={14} />
            Conectar Google Calendar
          </button>
        </>
      )}
    </div>
  )
}
