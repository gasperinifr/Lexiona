import { useState, useEffect } from 'react'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import {
  Plus, BookOpen, Sun, Moon, Sunset, Leaf, Settings2,
  Trash2, ChevronDown, X, Check, Clock,
} from 'lucide-react'
import ProgressoBar from '../components/ProgressoBar'

const TURNOS = [
  { value: 'matutino',   label: 'Matutino',   desc: 'Manhã',      icon: Sun,    cor: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { value: 'vespertino', label: 'Vespertino', desc: 'Tarde',      icon: Sunset, cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'noturno',    label: 'Noturno',    desc: 'Noite',      icon: Moon,   cor: 'text-indigo-400', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { value: 'integral',   label: 'Integral',   desc: 'Dia todo',   icon: Clock,  cor: 'text-lexiona-500', bg: 'bg-lexiona-50', border: 'border-lexiona-200' },
  { value: 'particular', label: 'Particular', desc: 'Sem fixo',   icon: Leaf,   cor: 'text-gold-500',   bg: 'bg-amber-50',  border: 'border-amber-200' },
]
const NIVEIS = ['fundamental','medio','superior','tecnico','livre']
const NIVEL_LABEL = { fundamental:'Fundamental', medio:'Médio', superior:'Superior', tecnico:'Técnico', livre:'Livre' }
const METODOLOGIAS = ['Tradicional','Construtivista','Sociointeracionista','Ativo / PBL','Híbrido','Outro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function TurnoBadge({ turno, small }) {
  const t = TURNOS.find(x => x.value === turno)
  if (!t) return null
  const Icon = t.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${t.bg} ${t.cor} ${t.border} ${small ? 'py-0' : ''}`}>
      <Icon size={10} />{t.label}
    </span>
  )
}

function ModalDisciplina({ onCriar, onFechar }) {
  const [nome, setNome] = useState('')
  const [turma, setTurma] = useState('')
  const [turno, setTurno] = useState('')
  const [nivel, setNivel] = useState('medio')
  const [metodologia, setMetodologia] = useState('Tradicional')
  const [carga, setCarga] = useState('50')
  const [bncc, setBncc] = useState('')
  const [modoIrregular, setModoIrregular] = useState(false)
  const [semPeriodo, setSemPeriodo] = useState(false)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [dias, setDias] = useState([])
  const [hInicio, setHInicio] = useState('')
  const [hFim, setHFim] = useState('')
  const [loading, setLoading] = useState(false)

  const irregular = modoIrregular || turno === 'particular'

  function toggleDia(i) {
    setDias(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  async function handleSubmit() {
    if (!nome.trim()) { toast.error('Informe o nome da disciplina.'); return }
    if (!turno) { toast.error('Selecione o turno.'); return }
    if (!irregular && !semPeriodo) {
      if (!inicio || !fim) { toast.error('Informe o período letivo.'); return }
      if (dias.length === 0) { toast.error('Selecione os dias de aula.'); return }
    }

    setLoading(true)
    try {
      const payload = {
        nome: nome.trim(),
        turma: turma.trim() || null,
        turno,
        nivel,
        carga_horaria_total: parseInt(carga) || 50,
        metodologia,
        modo_planejamento: (irregular || semPeriodo) ? 'irregular' : 'periodico',
        bncc_componente: bncc.trim() || null,
        ...(!irregular && !semPeriodo && {
          periodo_inicio: inicio,
          periodo_fim: fim,
          dias_semana: dias,
          horario_inicio: hInicio || null,
          horario_fim: hFim || null,
        }),
      }
      const res = await api.post('/disciplinas/', payload)
      toast.success(
        res.data.total_aulas_geradas > 0
          ? `Disciplina criada com ${res.data.total_aulas_geradas} aulas geradas!`
          : 'Disciplina criada!'
      )
      onCriar(res.data)
    } catch (err) {
      toastErro(err, 'Erro ao criar disciplina.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-lexiona-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-display font-bold text-lexiona-900">Nova disciplina</h2>
          <button onClick={onFechar} className="p-2 text-lexiona-400 hover:text-lexiona-700 hover:bg-lexiona-50 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Nome da disciplina *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Matemática, Biologia, Programação Web..."
              className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
          </div>

          {/* Turma e Nível separados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-lexiona-800">Turma</label>
              <input value={turma} onChange={e => setTurma(e.target.value)}
                placeholder="9°A, Turma B..."
                className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-lexiona-800">Nível</label>
              <select value={nivel} onChange={e => setNivel(e.target.value)}
                className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white">
                {NIVEIS.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
              </select>
            </div>
          </div>

          {/* Turno */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Turno *</label>
            <div className="grid grid-cols-3 gap-2">
              {TURNOS.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.value} onClick={() => { setTurno(t.value); if (t.value === 'particular') setModoIrregular(true) }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                      turno === t.value ? `${t.bg} ${t.cor} ${t.border} border-2` : 'bg-white text-lexiona-600 border-lexiona-200 hover:border-lexiona-300'
                    }`}>
                    <Icon size={16} />
                    <span>{t.label}</span>
                    <span className="text-lexiona-400 font-normal">{t.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Carga e metodologia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-lexiona-800">Duração (min)</label>
              <input type="number" value={carga} onChange={e => setCarga(e.target.value)} min="30" max="240" step="5"
                className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-lexiona-800">Metodologia</label>
              <select value={metodologia} onChange={e => setMetodologia(e.target.value)}
                className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white">
                {METODOLOGIAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* BNCC */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-lexiona-800">Componente BNCC <span className="text-lexiona-400 font-normal">(opcional)</span></label>
            <input value={bncc} onChange={e => setBncc(e.target.value)}
              placeholder="Ex: Matemática, Língua Portuguesa..."
              className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
          </div>

          {/* Toggle horário variável */}
          {turno && turno !== 'particular' && (
            <button onClick={() => setModoIrregular(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                modoIrregular ? 'bg-lexiona-50 border-lexiona-300' : 'bg-white border-lexiona-200 hover:border-lexiona-300'
              }`}>
              <div className="text-left">
                <p className="text-sm font-medium text-lexiona-800">Horário variável / Aulas irregulares</p>
                <p className="text-xs text-lexiona-400">Adicione aulas manualmente, sem datas pré-geradas</p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${modoIrregular ? 'bg-lexiona-600 border-lexiona-600' : 'border-lexiona-300'}`}>
                {modoIrregular && <Check size={12} className="text-white" />}
              </div>
            </button>
          )}

          {/* Período letivo — apenas no modo periódico */}
          {!irregular && (
            <>
              <button onClick={() => setSemPeriodo(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  semPeriodo ? 'bg-lexiona-50 border-lexiona-300' : 'bg-white border-lexiona-200 hover:border-lexiona-300'
                }`}>
                <div className="text-left">
                  <p className="text-sm font-medium text-lexiona-800">Sem período letivo definido</p>
                  <p className="text-xs text-lexiona-400">Definir depois ou não aplicável</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${semPeriodo ? 'bg-lexiona-600 border-lexiona-600' : 'border-lexiona-300'}`}>
                  {semPeriodo && <Check size={12} className="text-white" />}
                </div>
              </button>

              {!semPeriodo && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Início</label>
                      <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Fim</label>
                      <input type="date" value={fim} onChange={e => setFim(e.target.value)}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-lexiona-800">Dias de aula</label>
                    <div className="flex gap-2">
                      {DIAS_SEMANA.map((d, i) => (
                        <button key={i} onClick={() => toggleDia(i)}
                          className={`w-10 h-10 rounded-xl text-xs font-medium border transition-all ${dias.includes(i) ? 'bg-lexiona-600 text-white border-lexiona-600' : 'bg-white text-lexiona-600 border-lexiona-200 hover:border-lexiona-400'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Início das aulas</label>
                      <input type="time" value={hInicio} onChange={e => setHInicio(e.target.value)}
                        style={{ colorScheme: 'light' }}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Fim das aulas</label>
                      <input type="time" value={hFim} onChange={e => setHFim(e.target.value)}
                        style={{ colorScheme: 'light' }}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {irregular && (
            <div className="bg-lexiona-50 border border-lexiona-100 rounded-xl px-4 py-3">
              <p className="text-xs text-lexiona-600">
                As aulas serão adicionadas manualmente no calendário conforme necessário.
              </p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Plus size={16} /> Criar disciplina</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [expandida, setExpandida] = useState(null)

  useEffect(() => {
    api.get('/disciplinas/').then(r => setDisciplinas(r.data || [])).catch(err => toastErro(err)).finally(() => setLoading(false))
  }, [])

  async function handleDesativar(id) {
    if (!confirm('Tem certeza que deseja remover esta disciplina?')) return
    try {
      await api.delete(`/disciplinas/${id}`)
      setDisciplinas(prev => prev.filter(d => d.id !== id))
      toast.success('Disciplina removida.')
    } catch (err) {
      toastErro(err, 'Erro ao remover disciplina.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-lexiona-50 rounded-xl animate-pulse w-1/3" />
        {[1,2,3].map(i => <div key={i} className="h-32 bg-lexiona-50 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-lexiona-900">Disciplinas</h1>
          <p className="text-sm text-lexiona-400 mt-0.5">
            {disciplinas.length} {disciplinas.length === 1 ? 'disciplina ativa' : 'disciplinas ativas'}
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus size={16} /> Nova disciplina
        </button>
      </div>

      {/* Lista */}
      {disciplinas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-lexiona-100 p-16 text-center shadow-card">
          <div className="w-16 h-16 bg-lexiona-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-lexiona-300" />
          </div>
          <p className="font-semibold text-lexiona-700">Nenhuma disciplina ainda</p>
          <p className="text-sm text-lexiona-400 mt-1">Crie sua primeira disciplina para começar a planejar.</p>
          <button onClick={() => setModalAberto(true)}
            className="mt-6 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-6 py-2.5 rounded-xl transition">
            Criar primeira disciplina
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplinas.map(disc => {
            const turnoConf = TURNOS.find(t => t.value === disc.turno)
            const TIcon = turnoConf?.icon || BookOpen
            const isExpanded = expandida === disc.id

            return (
              <div key={disc.id} className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden transition-all hover:shadow-card-hover">
                {/* Card header */}
                <button
                  onClick={() => setExpandida(isExpanded ? null : disc.id)}
                  className="w-full px-6 py-5 flex items-center gap-4 text-left"
                >
                  {/* Ícone turno */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${turnoConf?.bg || 'bg-lexiona-50'} ${turnoConf?.border || 'border-lexiona-100'}`}>
                    <TIcon size={20} className={turnoConf?.cor || 'text-lexiona-500'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lexiona-900">{disc.nome}</h3>
                      {disc.turma && (
                        <span className="text-xs bg-lexiona-50 text-lexiona-600 px-2 py-0.5 rounded-full border border-lexiona-100">
                          {disc.turma}
                        </span>
                      )}
                      {disc.turno && <TurnoBadge turno={disc.turno} small />}
                      {disc.bncc_componente && (
                        <span className="text-xs bg-gold-50 text-gold-600 border border-gold-100 px-2 py-0.5 rounded-full">
                          BNCC
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-lexiona-400">{NIVEL_LABEL[disc.nivel] || disc.nivel}</span>
                      <span className="text-lexiona-200 text-xs">·</span>
                      <span className="text-xs text-lexiona-400">{disc.metodologia}</span>
                      {disc.modo_planejamento === 'irregular' && (
                        <>
                          <span className="text-lexiona-200 text-xs">·</span>
                          <span className="text-xs text-amber-600">Horário variável</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-lexiona-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expandido */}
                {isExpanded && (
                  <div className="border-t border-lexiona-50 px-6 pb-5 pt-4 space-y-4 animate-fade-in">
                    <ProgressoBar disciplina={disc} />

                    {/* Período */}
                    {disc.periodo_inicio && (
                      <div className="flex items-center gap-2 text-xs text-lexiona-500">
                        <span className="font-medium">Período:</span>
                        <span>{disc.periodo_inicio} → {disc.periodo_fim}</span>
                      </div>
                    )}

                    {disc.bncc_componente && (
                      <div className="flex items-center gap-2 text-xs text-lexiona-500">
                        <span className="font-medium">BNCC:</span>
                        <span>{disc.bncc_componente}</span>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDesativar(disc.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition border border-red-100"
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalDisciplina
          onCriar={disc => { setDisciplinas(prev => [disc, ...prev]); setModalAberto(false) }}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
