import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import { ChevronRight, ChevronLeft, Leaf, Check } from 'lucide-react'

const MODALIDADES = ['Escola pública', 'Escola particular', 'Ensino superior', 'Cursinho', 'Aulas particulares', 'Outros']
const NIVEIS = [
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'medio', label: 'Médio' },
  { value: 'superior', label: 'Superior' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'livre', label: 'Livre / Outro' },
]
const TURNOS = [
  { value: 'matutino', label: 'Matutino', desc: 'Manhã' },
  { value: 'vespertino', label: 'Vespertino', desc: 'Tarde' },
  { value: 'noturno', label: 'Noturno', desc: 'Noite' },
  { value: 'integral', label: 'Integral', desc: 'Dia todo' },
  { value: 'particular', label: 'Particular / Irregular', desc: 'Sem horário fixo' },
]
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const METODOLOGIAS = ['Tradicional', 'Construtivista', 'Sociointeracionista', 'Ativo / PBL', 'Híbrido', 'Outro']

export default function Onboarding() {
  const navigate = useNavigate()
  const [passo, setPasso] = useState(1)
  const [loading, setLoading] = useState(false)
  const professor = JSON.parse(localStorage.getItem('lexiona_professor') || '{}')

  // Passo 1 — Perfil
  const [modalidades, setModalidades] = useState([])
  const [modalidadeOutro, setModalidadeOutro] = useState('')

  // Passo 2 — Período letivo
  const [semPeriodoFixo, setSemPeriodoFixo] = useState(false)
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')

  // Passo 3 — Disciplina
  const [nomeDisciplina, setNomeDisciplina] = useState('')
  const [turma, setTurma] = useState('')
  const [turno, setTurno] = useState('')
  const [nivel, setNivel] = useState('medio')
  const [metodologia, setMetodologia] = useState('Tradicional')
  const [cargaHoraria, setCargaHoraria] = useState('50')
  const [diasSemana, setDiasSemana] = useState([])
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')
  const [bncc, setBncc] = useState('')
  const [horarioIrregular, setHorarioIrregular] = useState(false)

  function toggleModalidade(m) {
    setModalidades(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  function toggleDia(d) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleProximo() {
    if (passo === 1) {
      if (modalidades.length === 0) {
        toast.error('Selecione pelo menos uma modalidade de ensino.')
        return
      }
      setLoading(true)
      try {
        const modFinal = modalidades.includes('Outros') && modalidadeOutro
          ? [...modalidades.filter(m => m !== 'Outros'), modalidadeOutro]
          : modalidades
        await api.put('/auth/perfil', {
          modalidades: modFinal,
          nome: professor.nome,
        })
        setPasso(2)
      } catch (err) {
        toastErro(err, 'Erro ao salvar perfil.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (passo === 2) {
      if (!semPeriodoFixo && (!periodoInicio || !periodoFim)) {
        toast.error('Informe o período letivo ou marque "Não tenho período letivo fixo".')
        return
      }
      setPasso(3)
      return
    }

    if (passo === 3) {
      if (!nomeDisciplina.trim()) { toast.error('Informe o nome da disciplina.'); return }
      if (!turno) { toast.error('Selecione o turno da disciplina.'); return }
      if (!horarioIrregular && !semPeriodoFixo) {
        if (diasSemana.length === 0) { toast.error('Selecione pelo menos um dia da semana.'); return }
      }

      setLoading(true)
      try {
        const modoIrregular = horarioIrregular || turno === 'particular'
        const payload = {
          nome: nomeDisciplina.trim(),
          turma: turma.trim() || null,
          turno,
          nivel,
          carga_horaria_total: parseInt(cargaHoraria) || 50,
          metodologia,
          modo_planejamento: (modoIrregular || semPeriodoFixo) ? 'irregular' : 'periodico',
          bncc_componente: bncc.trim() || null,
          ...((!modoIrregular && !semPeriodoFixo) && {
            periodo_inicio: periodoInicio,
            periodo_fim: periodoFim,
            dias_semana: diasSemana,
            horario_inicio: horarioInicio || null,
            horario_fim: horarioFim || null,
          }),
        }

        await api.post('/disciplinas/', payload)
        await api.post('/auth/onboarding/concluir')
        toast.success('Tudo pronto! Seu espaço pedagógico está configurado 🎉')
        navigate('/app')
      } catch (err) {
        toastErro(err, 'Erro ao criar disciplina.')
      } finally {
        setLoading(false)
      }
    }
  }

  const modoIrregularAtivo = horarioIrregular || turno === 'particular'

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-lexiona-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lexiona-600 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lexiona-900">Lexiona</span>
        </div>
        <span className="text-sm text-lexiona-400">Passo {passo} de 3</span>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-lexiona-50">
        <div className="h-1 bg-lexiona-600 transition-all duration-500" style={{ width: `${(passo / 3) * 100}%` }} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">

          {/* ── PASSO 1 ─────────────────────────────── */}
          {passo === 1 && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-lexiona-900">
                  Olá, {professor.nome?.split(' ')[0] || 'professor'}! 👋
                </h1>
                <p className="text-lexiona-500 mt-1">
                  Vamos configurar seu espaço pedagógico. Começa contando onde você leciona.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-lexiona-800">Onde você leciona?</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODALIDADES.map(m => (
                    <button
                      key={m}
                      onClick={() => toggleModalidade(m)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                        modalidades.includes(m)
                          ? 'bg-lexiona-600 text-white border-lexiona-600'
                          : 'bg-white text-lexiona-700 border-lexiona-200 hover:border-lexiona-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {modalidades.includes('Outros') && (
                  <input
                    value={modalidadeOutro}
                    onChange={e => setModalidadeOutro(e.target.value)}
                    placeholder="Descreva onde você leciona..."
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white mt-2"
                  />
                )}
              </div>
            </>
          )}

          {/* ── PASSO 2 ─────────────────────────────── */}
          {passo === 2 && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-lexiona-900">Período letivo</h1>
                <p className="text-lexiona-500 mt-1">
                  Quando começa e termina o seu ano ou semestre?
                </p>
              </div>

              {/* Toggle sem período fixo */}
              <button
                onClick={() => setSemPeriodoFixo(v => !v)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
                  semPeriodoFixo
                    ? 'bg-lexiona-600 border-lexiona-600 text-white'
                    : 'bg-white border-lexiona-200 text-lexiona-700 hover:border-lexiona-400'
                }`}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Não tenho período letivo fixo</p>
                  <p className={`text-xs mt-0.5 ${semPeriodoFixo ? 'text-lexiona-200' : 'text-lexiona-400'}`}>
                    Aulas particulares, cursos livres, horários variáveis
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-4 ${
                  semPeriodoFixo ? 'bg-white border-white' : 'border-lexiona-300'
                }`}>
                  {semPeriodoFixo && <Check size={12} className="text-lexiona-600" />}
                </div>
              </button>

              {!semPeriodoFixo && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Início</label>
                      <input
                        type="date"
                        value={periodoInicio}
                        onChange={e => setPeriodoInicio(e.target.value)}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-lexiona-800">Fim</label>
                      <input
                        type="date"
                        value={periodoFim}
                        onChange={e => setPeriodoFim(e.target.value)}
                        className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-lexiona-400">
                    Os feriados nacionais de 2026 já foram pré-carregados. Você pode ajustá-los depois.
                  </p>
                </div>
              )}

              {semPeriodoFixo && (
                <div className="bg-lexiona-50 border border-lexiona-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-lexiona-600 leading-relaxed">
                    Tudo bem! Você vai adicionar suas aulas manualmente no calendário, sem precisar de datas fixas. Você pode definir um período depois nas configurações de cada disciplina.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── PASSO 3 ─────────────────────────────── */}
          {passo === 3 && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-lexiona-900">Primeira disciplina</h1>
                <p className="text-lexiona-500 mt-1">
                  Você pode adicionar mais depois. Comece com a mais importante.
                </p>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-lexiona-800">Nome da disciplina *</label>
                  <input
                    value={nomeDisciplina}
                    onChange={e => setNomeDisciplina(e.target.value)}
                    placeholder="Ex: Matemática, Biologia, Programação Web..."
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                  />
                </div>

                {/* Turma e Turno — separados */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-lexiona-800">Turma</label>
                    <input
                      value={turma}
                      onChange={e => setTurma(e.target.value)}
                      placeholder="Ex: 9°A, Turma B..."
                      className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-lexiona-800">Nível</label>
                    <select
                      value={nivel}
                      onChange={e => setNivel(e.target.value)}
                      className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                    >
                      {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Turno */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-lexiona-800">Turno *</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TURNOS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => {
                          setTurno(t.value)
                          if (t.value === 'particular') setHorarioIrregular(true)
                        }}
                        className={`px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${
                          turno === t.value
                            ? 'bg-lexiona-600 text-white border-lexiona-600'
                            : 'bg-white text-lexiona-700 border-lexiona-200 hover:border-lexiona-400'
                        }`}
                      >
                        <div className="font-medium">{t.label}</div>
                        <div className={`text-xs mt-0.5 ${turno === t.value ? 'text-lexiona-200' : 'text-lexiona-400'}`}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle horário variável (para turnos não-particulares) */}
                {turno && turno !== 'particular' && (
                  <button
                    onClick={() => setHorarioIrregular(v => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      horarioIrregular
                        ? 'bg-lexiona-50 border-lexiona-300 text-lexiona-800'
                        : 'bg-white border-lexiona-200 text-lexiona-600 hover:border-lexiona-300'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">Horário variável / Aulas particulares</p>
                      <p className="text-xs text-lexiona-400 mt-0.5">Sem dias e horários fixos definidos</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ml-4 ${
                      horarioIrregular ? 'bg-lexiona-600 border-lexiona-600' : 'border-lexiona-300'
                    }`}>
                      {horarioIrregular && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                )}

                {/* Carga horária e metodologia */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-lexiona-800">Duração da aula (min)</label>
                    <input
                      type="number"
                      value={cargaHoraria}
                      onChange={e => setCargaHoraria(e.target.value)}
                      min="30" max="240" step="5"
                      className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-lexiona-800">Metodologia</label>
                    <select
                      value={metodologia}
                      onChange={e => setMetodologia(e.target.value)}
                      className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                    >
                      {METODOLOGIAS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Componente BNCC (opcional) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-lexiona-800">
                    Componente BNCC <span className="text-lexiona-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    value={bncc}
                    onChange={e => setBncc(e.target.value)}
                    placeholder="Ex: Matemática, Língua Portuguesa, Ciências..."
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                  />
                  <p className="text-xs text-lexiona-400">A IA usará isso para contextualizar as sugestões na BNCC.</p>
                </div>

                {/* Dias e horários — apenas no modo periódico */}
                {!modoIrregularAtivo && !semPeriodoFixo && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-lexiona-800">Dias de aula</label>
                      <div className="flex gap-2 flex-wrap">
                        {DIAS_SEMANA.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => toggleDia(i)}
                            className={`w-12 h-12 rounded-xl text-sm font-medium border transition-all ${
                              diasSemana.includes(i)
                                ? 'bg-lexiona-600 text-white border-lexiona-600'
                                : 'bg-white text-lexiona-600 border-lexiona-200 hover:border-lexiona-400'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-lexiona-800">Início das aulas</label>
                        <input
                          type="time"
                          value={horarioInicio}
                          onChange={e => setHorarioInicio(e.target.value)}
                          className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-lexiona-800">Fim das aulas</label>
                        <input
                          type="time"
                          value={horarioFim}
                          onChange={e => setHorarioFim(e.target.value)}
                          className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {modoIrregularAtivo && (
                  <div className="bg-lexiona-50 border border-lexiona-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-lexiona-600 leading-relaxed">
                      Neste modo, você adiciona as aulas manualmente no calendário conforme elas acontecem. Sem horários fixos nem geração automática de datas.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── NAVEGAÇÃO ─────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            {passo > 1 && (
              <button
                onClick={() => setPasso(p => p - 1)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 border border-lexiona-200 text-lexiona-700 rounded-xl font-medium hover:bg-lexiona-50 transition disabled:opacity-60"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            <button
              onClick={handleProximo}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {passo === 3 ? 'Concluir configuração' : 'Próximo passo'}
                  {passo < 3 && <ChevronRight size={16} />}
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
