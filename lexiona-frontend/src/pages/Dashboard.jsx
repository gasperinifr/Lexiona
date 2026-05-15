import { useState, useEffect } from 'react'
import { api, toastErro } from '../services/api'
import { Link } from 'react-router-dom'
import {
  CalendarDays, BookOpen, CheckCircle2, AlertCircle,
  ChevronRight, Clock, Leaf, Sun, Moon, Sunset,
} from 'lucide-react'

const TURNO_CONFIG = {
  matutino:   { label: 'Matutino',   icon: Sun,    cor: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  vespertino: { label: 'Vespertino', icon: Sunset, cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  noturno:    { label: 'Noturno',    icon: Moon,   cor: 'text-indigo-400', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  integral:   { label: 'Integral',   icon: CalendarDays, cor: 'text-lexiona-500', bg: 'bg-lexiona-50', border: 'border-lexiona-100' },
  particular: { label: 'Particular', icon: Leaf,   cor: 'text-gold-500',   bg: 'bg-gold-50',   border: 'border-gold-100' },
}

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarData(dataStr) {
  if (!dataStr) return ''
  const [ano, mes, dia] = dataStr.split('-')
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${dia} de ${meses[parseInt(mes) - 1]}`
}

function formatarDiaSemana(dataStr) {
  if (!dataStr) return ''
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
  const d = new Date(dataStr + 'T12:00:00')
  return dias[d.getDay()]
}

export default function Dashboard() {
  const [agenda, setAgenda] = useState(null)
  const [alertas, setAlertas] = useState(null)
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)

  const professor = JSON.parse(localStorage.getItem('lexiona_professor') || '{}')
  const primeiroNome = professor.nome?.split(' ')[0] || 'Professor'

  useEffect(() => {
    Promise.all([
      api.get('/agenda/hoje'),
      api.get('/agenda/alertas'),
      api.get('/disciplinas/'),
    ]).then(([agendaRes, alertasRes, discRes]) => {
      setAgenda(agendaRes.data)
      setAlertas(alertasRes.data)
      setDisciplinas(discRes.data || [])
    }).catch(err => toastErro(err, 'Erro ao carregar o dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-lexiona-50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-lexiona-50 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-lexiona-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const totalDisciplinas = disciplinas.length
  const totalAulas = agenda?.total_aulas || 0
  const totalAlertas = alertas?.alertas?.length || 0

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── HERO SAUDAÇÃO ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-900 via-lexiona-800 to-lexiona-600 p-8 text-white shadow-card">
        {/* Decoração */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-lexiona-500 opacity-10 rounded-full translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-1/2 w-64 h-24 bg-lexiona-400 opacity-10 rounded-full" />

        <div className="relative z-10">
          <p className="text-lexiona-200 text-sm font-medium mb-1">
            {saudacao()},
          </p>
          <h1 className="font-display text-3xl font-bold mb-3">
            {primeiroNome} 👋
          </h1>
          <div className="flex items-center gap-2 text-lexiona-100 text-sm">
            <CalendarDays size={14} />
            <span>
              {formatarDiaSemana(agenda?.data)}, {formatarData(agenda?.data)}
            </span>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-5 border border-lexiona-100 shadow-card flex flex-col gap-1">
          <div className="w-9 h-9 bg-lexiona-50 rounded-xl flex items-center justify-center mb-2">
            <BookOpen size={18} className="text-lexiona-600" />
          </div>
          <span className="text-2xl font-bold text-lexiona-900">{totalDisciplinas}</span>
          <span className="text-xs text-lexiona-500">
            {totalDisciplinas === 1 ? 'Disciplina' : 'Disciplinas'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-lexiona-100 shadow-card flex flex-col gap-1">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-2">
            <Clock size={18} className="text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-lexiona-900">{totalAulas}</span>
          <span className="text-xs text-lexiona-500">
            {totalAulas === 1 ? 'Aula hoje' : 'Aulas hoje'}
          </span>
        </div>

        <Link
          to="/app/disciplinas"
          className={`rounded-2xl p-5 border shadow-card flex flex-col gap-1 transition-all hover:shadow-card-hover ${
            totalAlertas > 0
              ? 'bg-red-50 border-red-100'
              : 'bg-white border-lexiona-100'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
            totalAlertas > 0 ? 'bg-red-100' : 'bg-lexiona-50'
          }`}>
            <AlertCircle size={18} className={totalAlertas > 0 ? 'text-red-500' : 'text-lexiona-400'} />
          </div>
          <span className={`text-2xl font-bold ${totalAlertas > 0 ? 'text-red-600' : 'text-lexiona-900'}`}>
            {totalAlertas}
          </span>
          <span className="text-xs text-lexiona-500">Alertas</span>
        </Link>

      </div>

      {/* ── ALERTAS ───────────────────────────────────── */}
      {alertas?.tem_alertas && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h2 className="font-semibold text-amber-900 text-sm">
              Aulas sem planejamento nos próximos 3 dias
            </h2>
          </div>
          <div className="space-y-2">
            {alertas.alertas.map(a => (
              <div key={a.disciplina_id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-lexiona-900">{a.disciplina}</p>
                  <p className="text-xs text-lexiona-500">
                    {a.aulas_sem_plano} aula{a.aulas_sem_plano > 1 ? 's' : ''} pendente{a.aulas_sem_plano > 1 ? 's' : ''}
                  </p>
                </div>
                <Link to="/app/calendario" className="text-xs text-lexiona-600 hover:text-lexiona-800 font-medium flex items-center gap-1">
                  Planejar <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AGENDA DO DIA ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-lexiona-50 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lexiona-900">Agenda de hoje</h2>
            <p className="text-xs text-lexiona-400 mt-0.5">
              {formatarDiaSemana(agenda?.data)}, {formatarData(agenda?.data)}
            </p>
          </div>
          <Link to="/app/calendario" className="text-xs text-lexiona-600 hover:text-lexiona-800 font-medium flex items-center gap-1">
            Ver calendário <ChevronRight size={14} />
          </Link>
        </div>

        {agenda?.aulas?.length > 0 ? (
          <div className="divide-y divide-lexiona-50">
            {agenda.aulas.map(aula => {
              const turnoConf = TURNO_CONFIG[aula.disciplina_turno] || TURNO_CONFIG.matutino
              const TurnoIcon = turnoConf.icon
              return (
                <div key={aula.id} className="px-6 py-4 flex items-start gap-4 hover:bg-lexiona-50/40 transition">
                  {/* Indicador de turno */}
                  <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${turnoConf.bg} ${turnoConf.border} border`}>
                    <TurnoIcon size={16} className={turnoConf.cor} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-lexiona-900 text-sm">{aula.disciplina_nome}</p>
                      {aula.disciplina_turma && (
                        <span className="text-xs bg-lexiona-50 text-lexiona-600 px-2 py-0.5 rounded-full border border-lexiona-100">
                          {aula.disciplina_turma}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${turnoConf.bg} ${turnoConf.cor} ${turnoConf.border}`}>
                        {turnoConf.label}
                      </span>
                    </div>

                    <p className="text-sm text-lexiona-700 mt-1 font-medium">
                      {aula.tema || <span className="text-lexiona-400 italic">Sem tema definido</span>}
                    </p>

                    {aula.objetivos && (
                      <p className="text-xs text-lexiona-400 mt-0.5 line-clamp-1">{aula.objetivos}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className={`flex-shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    aula.status === 'planejada'
                      ? 'bg-lexiona-50 text-lexiona-700 border border-lexiona-100'
                      : aula.status === 'realizada'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {aula.status === 'planejada' ? '✓ Planejada' : aula.status === 'realizada' ? '✓ Realizada' : 'Pendente'}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-lexiona-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-lexiona-300" />
            </div>
            <p className="text-lexiona-700 font-medium">Nenhuma aula hoje</p>
            {agenda?.proximo_dia_com_aula ? (
              <p className="text-sm text-lexiona-400 mt-1">
                Próxima aula em{' '}
                <Link to="/app/calendario" className="text-lexiona-600 underline underline-offset-2">
                  {formatarDiaSemana(agenda.proximo_dia_com_aula)}, {formatarData(agenda.proximo_dia_com_aula)}
                </Link>
              </p>
            ) : (
              <p className="text-sm text-lexiona-400 mt-1">Nenhuma aula agendada nos próximos dias.</p>
            )}
          </div>
        )}
      </div>

      {/* ── DISCIPLINAS RÁPIDAS ───────────────────────── */}
      {disciplinas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lexiona-900">Suas disciplinas</h2>
            <Link to="/app/disciplinas" className="text-xs text-lexiona-600 hover:text-lexiona-800 font-medium flex items-center gap-1">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {disciplinas.slice(0, 4).map(disc => {
              const turnoConf = TURNO_CONFIG[disc.turno]
              return (
                <div key={disc.id} className="bg-white rounded-2xl border border-lexiona-100 shadow-card px-5 py-4 flex items-center gap-3 hover:shadow-card-hover transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${turnoConf?.bg || 'bg-lexiona-50'}`}>
                    <BookOpen size={16} className={turnoConf?.cor || 'text-lexiona-500'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lexiona-900 text-sm truncate">{disc.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {disc.turma && <span className="text-xs text-lexiona-400">{disc.turma}</span>}
                      {disc.turma && disc.turno && <span className="text-lexiona-200 text-xs">·</span>}
                      {disc.turno && <span className={`text-xs ${turnoConf?.cor || 'text-lexiona-400'}`}>{turnoConf?.label || disc.turno}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
