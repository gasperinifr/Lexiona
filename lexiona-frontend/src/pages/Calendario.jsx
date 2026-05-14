import { useState, useEffect, useCallback } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/pt-br'
import { api } from '../services/api'
import PainelAula from '../components/PainelAula'
import EntradaDados from '../components/EntradaDados'
import { BookOpen, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

moment.locale('pt-br')
const localizer = momentLocalizer(moment)

const STATUS_CORES = {
  planejada: '#2e9168',
  pendente:  '#d97706',
  cancelada: '#6b7280',
  realizada: '#3b82f6',
  feriado:   '#e5e7eb',
}

const MESSAGES = {
  today: 'Hoje', previous: '◀', next: '▶',
  month: 'Mês', week: 'Semana', day: 'Dia', agenda: 'Lista',
  date: 'Data', time: 'Hora', event: 'Aula',
  noEventsInRange: 'Nenhuma aula neste período',
}

export default function Calendario() {
  const [disciplinas, setDisciplinas] = useState([])
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null)
  const [eventos, setEventos] = useState([])
  const [aulaAtiva, setAulaAtiva] = useState(null)
  const [mostrarEntrada, setMostrarEntrada] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarDisciplinas()
  }, [])

  useEffect(() => {
    if (disciplinaSelecionada) carregarEventos(disciplinaSelecionada)
  }, [disciplinaSelecionada])

  const carregarDisciplinas = async () => {
    try {
      const res = await api.get('/disciplinas/')
      setDisciplinas(res.data)
      if (res.data.length > 0 && !disciplinaSelecionada) {
        setDisciplinaSelecionada(res.data[0].id)
      }
    } catch { toast.error('Erro ao carregar disciplinas') }
  }

  const carregarEventos = async (discId) => {
    setLoading(true)
    try {
      const res = await api.get(`/aulas/disciplina/${discId}`)
      const evts = res.data.map(a => ({
        id: a.id,
        title: a.tema || (a.status === 'pendente' ? '⏳ Pendente' : 'Aula'),
        start: new Date(a.data + 'T00:00:00'),
        end:   new Date(a.data + 'T23:59:59'),
        resource: a,
        status: a.status,
      }))
      setEventos(evts)
    } catch { toast.error('Erro ao carregar aulas') }
    finally { setLoading(false) }
  }

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: STATUS_CORES[event.status] || '#2e9168',
      borderRadius: '6px',
      border: 'none',
      color: event.status === 'feriado' ? '#6b7280' : 'white',
      fontSize: '0.75rem',
      padding: '2px 6px',
    }
  })

  const handleSelectEvent = (event) => setAulaAtiva(event.resource)

  const handleAulaAtualizada = () => {
    if (disciplinaSelecionada) carregarEventos(disciplinaSelecionada)
    setAulaAtiva(null)
  }

  const discAtiva = disciplinas.find(d => d.id === disciplinaSelecionada)

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)] animate-enter">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 space-y-4">
        <div>
          <label className="text-xs font-medium text-lexiona-500 uppercase tracking-wide mb-2 block">Disciplina</label>
          <div className="space-y-1">
            {disciplinas.map(d => (
              <button key={d.id} onClick={() => setDisciplinaSelecionada(d.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  disciplinaSelecionada === d.id
                    ? 'bg-lexiona-600 text-white font-medium shadow-sm'
                    : 'text-lexiona-700 hover:bg-lexiona-50 border border-transparent hover:border-lexiona-100'
                }`}>
                <div className="font-medium truncate">{d.nome}</div>
                {d.turma && <div className="text-xs opacity-70 mt-0.5">{d.turma}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="bg-white border border-lexiona-100 rounded-xl p-3">
          <p className="text-xs font-medium text-lexiona-500 uppercase tracking-wide mb-2">Legenda</p>
          {Object.entries({ planejada: 'Planejada', pendente: 'Pendente', realizada: 'Realizada', cancelada: 'Cancelada' }).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CORES[k] }} />
              <span className="text-xs text-lexiona-600">{v}</span>
            </div>
          ))}
        </div>

        {discAtiva && (
          <button onClick={() => setMostrarEntrada(true)}
            className="w-full flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white text-sm font-medium py-2.5 rounded-xl transition shadow-sm">
            <Plus size={16} /> Gerar plano com IA
          </button>
        )}
      </div>

      {/* Calendário */}
      <div className="flex-1 bg-white border border-lexiona-100 rounded-2xl p-4 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lexiona-600" />
          </div>
        ) : disciplinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen className="text-lexiona-200 mb-4" size={48} />
            <p className="text-lexiona-500 font-medium">Nenhuma disciplina cadastrada</p>
            <p className="text-lexiona-400 text-sm mt-1">Cadastre uma disciplina para ver o calendário</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            messages={MESSAGES}
            culture="pt-BR"
            views={['month', 'week', 'agenda']}
            popup
          />
        )}
      </div>

      {/* Painel lateral da aula */}
      {aulaAtiva && (
        <PainelAula
          aula={aulaAtiva}
          disciplina={discAtiva}
          onClose={() => setAulaAtiva(null)}
          onAtualizada={handleAulaAtualizada}
        />
      )}

      {/* Modal de entrada de dados */}
      {mostrarEntrada && discAtiva && (
        <EntradaDados
          disciplina={discAtiva}
          onClose={() => setMostrarEntrada(false)}
          onPlanoGerado={() => {
            setMostrarEntrada(false)
            if (disciplinaSelecionada) carregarEventos(disciplinaSelecionada)
          }}
        />
      )}
    </div>
  )
}