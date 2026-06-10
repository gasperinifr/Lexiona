import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, Edit3, Save, X,
  Lightbulb, Sun, Moon, Sunset, Leaf, RotateCcw,
  Bot,
} from 'lucide-react'
import GeradorIdeias from './GeradorIdeias'
import ChatAgente from './ChatAgente'

const STATUS_ACTIONS = [
  { value: 'planejada', label: 'Planejada', icon: CheckCircle2, cor: 'bg-lexiona-50 hover:bg-lexiona-100 text-lexiona-700 border-lexiona-200' },
  { value: 'realizada', label: 'Realizada', icon: CheckCircle2, cor: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle,      cor: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' },
  { value: 'pendente',  label: 'Pendente',  icon: Clock,         cor: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
]

const TURNO_CONFIG = {
  matutino:   { label: 'Matutino',   icon: Sun,    cor: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  vespertino: { label: 'Vespertino', icon: Sunset, cor: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  noturno:    { label: 'Noturno',    icon: Moon,   cor: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  integral:   { label: 'Integral',   icon: Clock,  cor: 'text-lexiona-600', bg: 'bg-lexiona-50', border: 'border-lexiona-100' },
  particular: { label: 'Particular', icon: Leaf,   cor: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
}

function Campo({ label, value, editando, onChange, placeholder, multiline }) {
  if (!editando && !value) return null
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-lexiona-500 uppercase tracking-wide">{label}</label>
      {editando ? (
        multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white resize-none"
          />
        ) : (
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
          />
        )
      ) : (
        <p className="text-sm text-lexiona-800 leading-relaxed">{value}</p>
      )}
    </div>
  )
}

export default function PainelAula({ aula, disciplina, onAtualizar, onMudarStatus, replanejando }) {
  const [editando, setEditando] = useState(false)
  const [tema, setTema] = useState(aula.tema || '')
  const [objetivos, setObjetivos] = useState(aula.objetivos || '')
  const [conteudos, setConteudos] = useState(aula.conteudos || '')
  const [recursos, setRecursos] = useState(aula.recursos || '')
  const [metodologia, setMetodologia] = useState(aula.metodologia_aula || '')
  const [salvando, setSalvando] = useState(false)
  const [mostrarIdeias, setMostrarIdeias] = useState(false)
  const [mostrarChat, setMostrarChat] = useState(false)

  const turnoConf = TURNO_CONFIG[disciplina?.turno]
  const TurnoIcon = turnoConf?.icon

  useEffect(() => {
    setTema(aula.tema || '')
    setObjetivos(aula.objetivos || '')
    setConteudos(aula.conteudos || '')
    setRecursos(aula.recursos || '')
    setMetodologia(aula.metodologia_aula || '')
    setEditando(false)
    setMostrarIdeias(false)
    setMostrarChat(false)
  }, [aula.id])

  async function handleSalvar() {
    setSalvando(true)
    try {
      await onAtualizar({ tema, objetivos, conteudos, recursos, metodologia_aula: metodologia })
      setEditando(false)
    } finally {
      setSalvando(false)
    }
  }

  function handleCancelarEdicao() {
    setTema(aula.tema || '')
    setObjetivos(aula.objetivos || '')
    setConteudos(aula.conteudos || '')
    setRecursos(aula.recursos || '')
    setMetodologia(aula.metodologia_aula || '')
    setEditando(false)
  }

  async function handleAplicarIdeia(ideia) {
    const dados = {
      tema: ideia.titulo || tema,
      objetivos: objetivos || ideia.diferencial || '',
      conteudos: ideia.descricao || conteudos,
      recursos: ideia.recursos || recursos,
      metodologia_aula: ideia.metodologia_sugerida || metodologia,
    }
    setTema(dados.tema)
    setObjetivos(dados.objetivos)
    setConteudos(dados.conteudos)
    setRecursos(dados.recursos)
    setMetodologia(dados.metodologia_aula)
    await onAtualizar(dados)
    setMostrarIdeias(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-lexiona-200 shadow-card overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-lexiona-50 bg-gradient-to-r from-lexiona-50 to-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-lexiona-400 uppercase tracking-wide">
                Aula #{aula.numero_aula}
              </span>
              {disciplina?.turno && turnoConf && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${turnoConf.bg} ${turnoConf.cor} ${turnoConf.border}`}>
                  {TurnoIcon && <TurnoIcon size={10} />}
                  {turnoConf.label}
                </span>
              )}
              {disciplina?.turma && (
                <span className="text-xs bg-lexiona-100 text-lexiona-600 px-2 py-0.5 rounded-full">
                  {disciplina.turma}
                </span>
              )}
            </div>
            <p className="font-display font-bold text-lexiona-900 text-base leading-tight">
              {disciplina?.nome}
            </p>
            {disciplina?.bncc_componente && (
              <p className="text-xs text-gold-500 font-medium mt-0.5">BNCC · {disciplina.bncc_componente}</p>
            )}
          </div>

          {/* Botão editar / fechar */}
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="p-2 rounded-lg text-lexiona-400 hover:text-lexiona-700 hover:bg-lexiona-100 transition flex-shrink-0"
              title="Editar aula"
            >
              <Edit3 size={16} />
            </button>
          ) : (
            <button
              onClick={handleCancelarEdicao}
              className="p-2 rounded-lg text-lexiona-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
              title="Cancelar edição"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Replanejando indicator */}
      {replanejando && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <RotateCcw size={14} className="text-amber-600 animate-spin" />
          <p className="text-xs text-amber-700 font-medium">Redistribuindo conteúdo com IA...</p>
        </div>
      )}

      {!editando && (
        <div className="px-5 py-4 border-b border-lexiona-50 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setMostrarIdeias(v => !v); setMostrarChat(false) }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition ${
                mostrarIdeias
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100'
              }`}
            >
              <Lightbulb size={14} /> Ideias IA
            </button>
            <button
              onClick={() => { setMostrarChat(v => !v); setMostrarIdeias(false) }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition ${
                mostrarChat
                  ? 'bg-lexiona-100 text-lexiona-800 border-lexiona-200'
                  : 'bg-lexiona-50 hover:bg-lexiona-100 text-lexiona-700 border-lexiona-100'
              }`}
            >
              <Bot size={14} /> Ajustar plano
            </button>
          </div>

          {mostrarIdeias && disciplina?.id && (
            <GeradorIdeias
              disciplinaId={disciplina.id}
              data={aula.data}
              onAplicar={handleAplicarIdeia}
              onFechar={() => setMostrarIdeias(false)}
            />
          )}

          {mostrarChat && disciplina?.id && (
            <ChatAgente
              disciplinaId={disciplina.id}
              onFechar={() => setMostrarChat(false)}
            />
          )}
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-5 space-y-4">

        <Campo label="Tema" value={tema} editando={editando} onChange={setTema} placeholder="Tema desta aula" />
        <Campo label="Objetivos" value={objetivos} editando={editando} onChange={setObjetivos} placeholder="O que o aluno será capaz de fazer..." multiline />
        <Campo label="Conteúdos" value={conteudos} editando={editando} onChange={setConteudos} placeholder="Conteúdos específicos desta aula..." multiline />
        <Campo label="Recursos" value={recursos} editando={editando} onChange={setRecursos} placeholder="Materiais e recursos necessários..." multiline />
        <Campo label="Metodologia" value={metodologia} editando={editando} onChange={setMetodologia} placeholder="Estratégia para esta aula..." multiline />

        {!editando && !tema && !objetivos && !conteudos && (
          <div className="py-6 text-center">
            <div className="w-10 h-10 bg-lexiona-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Lightbulb size={18} className="text-lexiona-300" />
            </div>
            <p className="text-xs text-lexiona-400">Esta aula ainda não tem planejamento.</p>
            <button onClick={() => setEditando(true)} className="mt-2 text-xs text-lexiona-600 underline underline-offset-2 hover:text-lexiona-800">
              Adicionar agora
            </button>
          </div>
        )}

        {/* Botão salvar */}
        {editando && (
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {salvando
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Save size={14} /> Salvar</>}
          </button>
        )}
      </div>

      {/* Status actions */}
      {!editando && (
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold text-lexiona-400 uppercase tracking-wide mb-2">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ACTIONS.map(s => {
              const Icon = s.icon
              const ativo = aula.status === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => onMudarStatus(s.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${s.cor} ${
                    ativo ? 'ring-2 ring-offset-1 ring-current opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <Icon size={13} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
