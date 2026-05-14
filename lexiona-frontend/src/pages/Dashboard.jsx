import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BookOpen, Clock, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import ProgressoBar from '../components/ProgressoBar'

const STATUS_CONFIG = {
  planejada: { cor: 'text-lexiona-700 bg-lexiona-50 border-lexiona-200', icone: <CheckCircle size={16} className="text-lexiona-600" />, label: 'Planejada' },
  pendente:  { cor: 'text-amber-700 bg-amber-50 border-amber-200', icone: <Clock size={16} className="text-amber-500" />, label: 'Pendente' },
  cancelada: { cor: 'text-gray-500 bg-gray-50 border-gray-200', icone: <AlertCircle size={16} className="text-gray-400" />, label: 'Cancelada' },
  realizada: { cor: 'text-blue-700 bg-blue-50 border-blue-200', icone: <CheckCircle size={16} className="text-blue-500" />, label: 'Realizada' },
}

export default function Dashboard() {
  const { professor } = useAuth()
  const [agenda, setAgenda] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [disciplinas, setDisciplinas] = useState([])

  useEffect(() => {
    const carregar = async () => {
      try {
        const [agendaRes, alertasRes, discRes] = await Promise.all([
          api.get('/agenda/hoje'),
          api.get('/agenda/alertas'),
          api.get('/disciplinas/'),
        ])
        setAgenda(agendaRes.data)
        setAlertas(alertasRes.data.alertas || [])
        setDisciplinas(discRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lexiona-600" />
    </div>
  )

  const hoje = new Date()
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-lexiona-900">
          {saudacao}, {professor?.nome?.split(' ')[0]} 👋
        </h1>
        <p className="text-lexiona-500 mt-1 text-sm">
          {format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-amber-500" />
            <span className="font-medium text-amber-800 text-sm">
              {alertas.length === 1 ? '1 disciplina com aulas sem plano nos próximos 3 dias' :
               `${alertas.length} disciplinas com aulas sem plano nos próximos 3 dias`}
            </span>
          </div>
          <div className="space-y-1">
            {alertas.map((a, i) => (
              <div key={i} className="text-sm text-amber-700">
                • <strong>{a.disciplina}</strong>: {a.aulas_sem_plano} aula(s) pendente(s) — {a.datas.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aulas de hoje */}
      <div>
        <h2 className="text-lg font-display font-semibold text-lexiona-900 mb-3">
          {agenda?.total_aulas > 0 ? `${agenda.total_aulas} aula(s) hoje` : 'Nenhuma aula hoje'}
        </h2>

        {agenda?.aulas?.length > 0 ? (
          <div className="space-y-3">
            {agenda.aulas.map((aula) => {
              const cfg = STATUS_CONFIG[aula.status] || STATUS_CONFIG.pendente
              return (
                <div key={aula.id} className={`border rounded-xl p-4 transition hover:shadow-sm ${cfg.cor}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {cfg.icone}
                        <span className="text-xs font-medium uppercase tracking-wide">{cfg.label}</span>
                        <span className="text-xs text-lexiona-400">•</span>
                        <span className="text-xs">{aula.disciplina_nome}</span>
                      </div>
                      <h3 className="font-semibold text-sm">
                        {aula.tema || 'Aula sem tema definido'}
                      </h3>
                      {aula.objetivos && (
                        <p className="text-xs mt-1 opacity-75 line-clamp-2">{aula.objetivos}</p>
                      )}
                      {aula.recursos && (
                        <p className="text-xs mt-1 opacity-60">📦 {aula.recursos}</p>
                      )}
                    </div>
                    {aula.numero_aula && (
                      <span className="text-xs font-mono bg-white/60 px-2 py-1 rounded-lg ml-3">
                        #{aula.numero_aula}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-lexiona-100 rounded-xl p-6 text-center">
            <BookOpen className="mx-auto text-lexiona-200 mb-3" size={36} />
            <p className="text-lexiona-500 text-sm">Sem aulas para hoje.</p>
            {agenda?.proximo_dia_com_aula && (
              <p className="text-lexiona-400 text-xs mt-1">
                Próxima aula em: {format(parseISO(agenda.proximo_dia_com_aula), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progresso das disciplinas */}
      {disciplinas.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold text-lexiona-900 mb-3">Progresso das disciplinas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {disciplinas.map(d => (
              <ProgressoBar key={d.id} disciplina={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}