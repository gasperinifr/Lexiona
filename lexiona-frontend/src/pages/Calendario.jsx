import { useState, useEffect, useCallback } from 'react'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import {
  ChevronLeft, ChevronRight, Sun, Moon, Sunset, Leaf,
  Clock, CheckCircle2, XCircle, AlertCircle, Plus,
  RotateCcw, Lightbulb,
} from 'lucide-react'
import PainelAula from '../components/PainelAula'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const TURNO_CONFIG = {
  matutino:   { cor: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   icon: Sun,    label: 'Mat' },
  vespertino: { cor: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', icon: Sunset, label: 'Ves' },
  noturno:    { cor: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400', icon: Moon,   label: 'Not' },
  integral:   { cor: 'bg-lexiona-100 text-lexiona-700 border-lexiona-200', dot: 'bg-lexiona-400', icon: Clock, label: 'Int' },
  particular: { cor: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-gold-400',   icon: Leaf,   label: 'Par' },
}

const STATUS_CONFIG = {
  planejada:  { cor: 'bg-lexiona-50 text-lexiona-700 border border-lexiona-200', label: 'Planejada', icon: CheckCircle2 },
  realizada:  { cor: 'bg-green-50 text-green-700 border border-green-200',       label: 'Realizada', icon: CheckCircle2 },
  cancelada:  { cor: 'bg-red-50 text-red-600 border border-red-200',             label: 'Cancelada', icon: XCircle },
  pendente:   { cor: 'bg-amber-50 text-amber-700 border border-amber-200',       label: 'Pendente',  icon: AlertCircle },
}

function TurnoBadge({ turno }) {
  const conf = TURNO_CONFIG[turno]
  if (!conf) return null
  const Icon = conf.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border ${conf.cor}`}>
      <Icon size={10} />{conf.label}
    </span>
  )
}

export default function Calendario() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [aulaSelecionada, setAulaSelecionada] = useState(null)
  const [aulasPorData, setAulasPorData] = useState({})
  const [disciplinas, setDisciplinas] = useState([])
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [modalAdicionarAula, setModalAdicionarAula] = useState(false)
  const [replanejandoId, setReplanejandoId] = useState(null)

  const carregarAulas = useCallback(async () => {
    setLoading(true)
    try {
      const [discRes] = await Promise.all([api.get('/disciplinas/')])
      const discs = discRes.data || []
      setDisciplinas(discs)

      // Buscar aulas de todas as disciplinas para o mês
      const aulaMap = {}
      await Promise.all(
        discs.map(async d => {
          const res = await api.get(`/aulas/disciplina/${d.id}`)
          for (const aula of res.data || []) {
            if (!aulaMap[aula.data]) aulaMap[aula.data] = []
            aulaMap[aula.data].push({ ...aula, _disc: d })
          }
        })
      )
      setAulasPorData(aulaMap)
    } catch (err) {
      toastErro(err, 'Erro ao carregar o calendário.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregarAulas() }, [carregarAulas])

  function navMes(dir) {
    let nm = mes + dir
    let na = ano
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm)
    setAno(na)
  }

  // Estrutura do calendário
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const celulas = Array(primeiroDia).fill(null).concat(
    Array.from({ length: diasNoMes }, (_, i) => i + 1)
  )
  while (celulas.length % 7 !== 0) celulas.push(null)

  function formatData(dia) {
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function aulasNoDia(dia) {
    if (!dia) return []
    const aulas = aulasPorData[formatData(dia)] || []
    return disciplinaFiltro === 'todas' ? aulas : aulas.filter(a => a.disciplina_id === disciplinaFiltro)
  }

  async function handleAtualizarAula(aulaId, dados) {
    try {
      await api.put(`/aulas/${aulaId}`, dados)
      await carregarAulas()
      toast.success('Aula atualizada!')
    } catch (err) {
      toastErro(err, 'Erro ao atualizar aula.')
    }
  }

  async function handleMudarStatus(aulaId, novoStatus) {
    try {
      await api.patch(`/aulas/${aulaId}/status?status=${novoStatus}`)

      // Se cancelou, perguntar sobre replanejamento
      if (novoStatus === 'cancelada') {
        const aula = aulaSelecionada
        const disc = disciplinas.find(d => d.id === aula?.disciplina_id)
        if (aula && disc) {
          const confirmar = window.confirm(
            `Aula cancelada.\n\nDeseja redistribuir o conteúdo desta aula nas próximas aulas pendentes?`
          )
          if (confirmar) {
            setReplanejandoId(aulaId)
            try {
              const res = await api.post('/agente/replanejamento', {
                disciplina_id: aula.disciplina_id,
                aula_cancelada_id: aulaId,
                motivo: 'Cancelamento pelo professor',
              })
              toast.success(res.data.mensagem || 'Conteúdo redistribuído!')
            } catch (err) {
              toastErro(err, 'Erro no replanejamento.')
            } finally {
              setReplanejandoId(null)
            }
          }
        }
      }

      await carregarAulas()
      setAulaSelecionada(prev => prev ? { ...prev, status: novoStatus } : prev)
    } catch (err) {
      toastErro(err, 'Erro ao atualizar status.')
    }
  }

  async function handleAdicionarAulaManual(disciplinaId, data) {
    try {
      const res = await api.post('/aulas/manual', {
        disciplina_id: disciplinaId,
        data,
      })
      await carregarAulas()
      toast.success('Aula adicionada!')
      setModalAdicionarAula(false)
    } catch (err) {
      toastErro(err, 'Erro ao adicionar aula.')
    }
  }

  const hoje_str = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-lexiona-900">Calendário</h1>
          <p className="text-sm text-lexiona-400 mt-0.5">
            {MESES[mes]} {ano}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por disciplina */}
          <select
            value={disciplinaFiltro}
            onChange={e => setDisciplinaFiltro(e.target.value)}
            className="px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white text-lexiona-700"
          >
            <option value="todas">Todas as disciplinas</option>
            {disciplinas.map(d => (
              <option key={d.id} value={d.id}>
                {d.nome}{d.turma ? ` — ${d.turma}` : ''}
              </option>
            ))}
          </select>

          {/* Navegação */}
          <button onClick={() => navMes(-1)} className="p-2 rounded-xl border border-lexiona-200 text-lexiona-600 hover:bg-lexiona-50 transition">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth()) }}
            className="px-3 py-2 text-xs font-semibold border border-lexiona-200 rounded-xl text-lexiona-600 hover:bg-lexiona-50 transition"
          >
            Hoje
          </button>
          <button onClick={() => navMes(1)} className="p-2 rounded-xl border border-lexiona-200 text-lexiona-600 hover:bg-lexiona-50 transition">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── CALENDÁRIO ──────────────────────────────── */}
        <div className="flex-1 bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">

          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 border-b border-lexiona-50">
            {DIAS_ABREV.map(d => (
              <div key={d} className="text-center py-3 text-xs font-semibold text-lexiona-400">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="p-6">
              <div className="grid grid-cols-7 gap-1">
                {Array(35).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-lexiona-50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {celulas.map((dia, idx) => {
                const aulas = aulasNoDia(dia)
                const dataStr = dia ? formatData(dia) : null
                const isHoje = dataStr === hoje_str
                const isSelecionado = diaSelecionado === dia

                return (
                  <div
                    key={idx}
                    onClick={() => dia && setDiaSelecionado(dia === diaSelecionado ? null : dia)}
                    className={`min-h-[72px] p-2 border-b border-r border-lexiona-50 transition-all cursor-pointer
                      ${!dia ? 'bg-lexiona-50/30 pointer-events-none' : 'hover:bg-lexiona-50/60'}
                      ${isSelecionado ? 'bg-lexiona-50 ring-1 ring-inset ring-lexiona-300' : ''}
                    `}
                  >
                    {dia && (
                      <>
                        {/* Número do dia */}
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition ${
                          isHoje
                            ? 'bg-lexiona-600 text-white font-bold'
                            : isSelecionado
                            ? 'bg-lexiona-100 text-lexiona-800'
                            : 'text-lexiona-600 hover:bg-lexiona-100'
                        }`}>
                          {dia}
                        </div>

                        {/* Indicadores de aulas */}
                        <div className="space-y-0.5">
                          {aulas.slice(0, 3).map(aula => {
                            const tc = TURNO_CONFIG[aula._disc?.turno] || TURNO_CONFIG.matutino
                            return (
                              <div
                                key={aula.id}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs border truncate ${tc.cor}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tc.dot}`} />
                                <span className="truncate text-[10px]">{aula._disc?.nome || 'Aula'}</span>
                              </div>
                            )
                          })}
                          {aulas.length > 3 && (
                            <div className="text-[10px] text-lexiona-400 px-1.5">+{aulas.length - 3}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── PAINEL LATERAL ──────────────────────────── */}
        <div className="lg:w-80 space-y-4">

          {diaSelecionado ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lexiona-900">
                  {DIAS_ABREV[new Date(ano, mes, diaSelecionado).getDay()]},{' '}
                  {diaSelecionado} de {MESES[mes]}
                </h3>
                {/* Botão adicionar aula manual (para disciplinas irregulares) */}
                {disciplinas.some(d => d.modo_planejamento === 'irregular') && (
                  <button
                    onClick={() => setModalAdicionarAula(true)}
                    className="p-2 rounded-xl bg-lexiona-50 hover:bg-lexiona-100 text-lexiona-600 transition border border-lexiona-100"
                    title="Adicionar aula nesta data"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {aulasNoDia(diaSelecionado).length === 0 ? (
                <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card p-8 text-center">
                  <CheckCircle2 size={28} className="text-lexiona-200 mx-auto mb-3" />
                  <p className="text-sm text-lexiona-500 font-medium">Sem aulas neste dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aulasNoDia(diaSelecionado).map(aula => {
                    const sc = STATUS_CONFIG[aula.status] || STATUS_CONFIG.pendente
                    const tc = TURNO_CONFIG[aula._disc?.turno]
                    const StatusIcon = sc.icon
                    return (
                      <div
                        key={aula.id}
                        onClick={() => setAulaSelecionada(aulaSelecionada?.id === aula.id ? null : aula)}
                        className={`bg-white rounded-2xl border shadow-card p-4 cursor-pointer transition-all hover:shadow-card-hover ${
                          aulaSelecionada?.id === aula.id ? 'border-lexiona-300 ring-1 ring-lexiona-200' : 'border-lexiona-100'
                        }`}
                      >
                        {/* Disciplina + turno */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-lexiona-900 text-sm truncate">{aula._disc?.nome}</p>
                            {aula._disc?.turma && (
                              <p className="text-xs text-lexiona-400">{aula._disc.turma}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {tc && <TurnoBadge turno={aula._disc?.turno} />}
                          </div>
                        </div>

                        {/* Tema */}
                        <p className="text-sm text-lexiona-700 mb-2">
                          {aula.tema || <span className="text-lexiona-300 italic text-xs">Sem tema definido</span>}
                        </p>

                        {/* Status */}
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cor}`}>
                          <StatusIcon size={11} />
                          {sc.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card p-8 text-center">
              <div className="w-12 h-12 bg-lexiona-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ChevronRight size={20} className="text-lexiona-300" />
              </div>
              <p className="text-sm text-lexiona-500 font-medium">Selecione um dia</p>
              <p className="text-xs text-lexiona-400 mt-1">Clique em qualquer data para ver e editar as aulas</p>
            </div>
          )}

          {/* Painel de edição da aula selecionada */}
          {aulaSelecionada && (
            <div className="animate-slide-up">
              <PainelAula
                aula={aulaSelecionada}
                disciplina={disciplinas.find(d => d.id === aulaSelecionada.disciplina_id)}
                onAtualizar={dados => handleAtualizarAula(aulaSelecionada.id, dados)}
                onMudarStatus={status => handleMudarStatus(aulaSelecionada.id, status)}
                replanejando={replanejandoId === aulaSelecionada.id}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal adicionar aula manual */}
      {modalAdicionarAula && (
        <ModalAdicionarAula
          data={formatData(diaSelecionado)}
          disciplinas={disciplinas.filter(d => d.modo_planejamento === 'irregular')}
          onAdicionar={handleAdicionarAulaManual}
          onFechar={() => setModalAdicionarAula(false)}
        />
      )}
    </div>
  )
}

function ModalAdicionarAula({ data, disciplinas, onAdicionar, onFechar }) {
  const [discId, setDiscId] = useState(disciplinas[0]?.id || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!discId) { toast.error('Selecione uma disciplina.'); return }
    setLoading(true)
    try {
      await onAdicionar(discId, data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-lexiona-900">Adicionar aula</h2>
        <p className="text-sm text-lexiona-500">{data}</p>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-lexiona-800">Disciplina</label>
          <select value={discId} onChange={e => setDiscId(e.target.value)}
            className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white">
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}{d.turma ? ` — ${d.turma}` : ''}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 py-2.5 border border-lexiona-200 text-lexiona-600 rounded-xl text-sm font-medium hover:bg-lexiona-50 transition">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-lexiona-600 hover:bg-lexiona-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
