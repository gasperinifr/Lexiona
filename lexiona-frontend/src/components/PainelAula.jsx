import { useState } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { X, Edit3, Lightbulb, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import GeradorIdeias from './GeradorIdeias'
import ChatAgente from './ChatAgente'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PainelAula({ aula, disciplina, onClose, onAtualizada }) {
  const [editando, setEditando] = useState(false)
  const [mostrarIdeias, setMostrarIdeias] = useState(false)
  const [mostrarChat, setMostrarChat] = useState(false)
  const [form, setForm] = useState({
    tema: aula.tema || '', objetivos: aula.objetivos || '',
    conteudos: aula.conteudos || '', recursos: aula.recursos || '',
    metodologia_aula: aula.metodologia_aula || '',
  })
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await api.put(`/aulas/${aula.id}`, form)
      toast.success('Aula atualizada!')
      setEditando(false)
      onAtualizada()
    } catch { toast.error('Erro ao salvar') }
    finally { setSalvando(false) }
  }

  const handleStatus = async (novoStatus) => {
    try {
      await api.patch(`/aulas/${aula.id}/status?status=${novoStatus}`)
      toast.success(`Status atualizado para "${novoStatus}"`)
      onAtualizada()
    } catch { toast.error('Erro ao atualizar status') }
  }

  const handleAplicarIdeia = async (ideia) => {
    try {
      await api.put(`/aulas/${aula.id}`, {
        tema: ideia.titulo,
        objetivos: ideia.diferencial,
        conteudos: ideia.descricao,
        recursos: ideia.recursos,
        metodologia_aula: ideia.metodologia_sugerida,
      })
      toast.success('Ideia aplicada à aula!')
      setMostrarIdeias(false)
      onAtualizada()
    } catch { toast.error('Erro ao aplicar ideia') }
  }

  const dataFormatada = format(parseISO(aula.data), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="w-80 flex-shrink-0 bg-white border border-lexiona-100 rounded-2xl flex flex-col animate-slide-in overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-lexiona-100 flex items-start justify-between">
        <div>
          <p className="text-xs text-lexiona-500 capitalize">{dataFormatada}</p>
          <h3 className="font-display font-semibold text-lexiona-900 mt-0.5">
            {aula.tema || 'Aula sem tema'}
          </h3>
          {disciplina && <p className="text-xs text-lexiona-400 mt-0.5">{disciplina.nome}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 text-lexiona-400 hover:text-lexiona-700 hover:bg-lexiona-50 rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!editando ? (
          <>
            {[
              { label: 'Objetivos', value: aula.objetivos },
              { label: 'Conteúdos', value: aula.conteudos },
              { label: 'Metodologia', value: aula.metodologia_aula },
              { label: 'Recursos', value: aula.recursos },
            ].map(({ label, value }) => value && (
              <div key={label}>
                <p className="text-xs font-medium text-lexiona-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm text-lexiona-800 leading-relaxed">{value}</p>
              </div>
            ))}

            {!aula.tema && !aula.objetivos && (
              <div className="text-center py-6 text-lexiona-400 text-sm">
                <p>Esta aula ainda não tem plano definido.</p>
                <p className="mt-1">Use o Gerador de Ideias para começar! 💡</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Tema *', key: 'tema', rows: 2 },
              { label: 'Objetivos', key: 'objetivos', rows: 3 },
              { label: 'Conteúdos', key: 'conteudos', rows: 3 },
              { label: 'Metodologia', key: 'metodologia_aula', rows: 2 },
              { label: 'Recursos', key: 'recursos', rows: 2 },
            ].map(({ label, key, rows }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-lexiona-600 mb-1">{label}</label>
                <textarea
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  rows={rows}
                  className="w-full px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Gerador de Ideias */}
        {mostrarIdeias && disciplina && (
          <GeradorIdeias
            disciplinaId={disciplina.id}
            data={aula.data}
            onAplicar={handleAplicarIdeia}
            onFechar={() => setMostrarIdeias(false)}
          />
        )}

        {/* Chat */}
        {mostrarChat && disciplina && (
          <ChatAgente disciplinaId={disciplina.id} onFechar={() => setMostrarChat(false)} />
        )}
      </div>

      {/* Ações */}
      <div className="p-4 border-t border-lexiona-100 space-y-2">
        {!editando ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setEditando(true)}
                className="flex items-center justify-center gap-1.5 py-2 border border-lexiona-200 text-lexiona-700 text-xs font-medium rounded-xl hover:bg-lexiona-50 transition">
                <Edit3 size={14} /> Editar
              </button>
              <button onClick={() => setMostrarIdeias(!mostrarIdeias)}
                className="flex items-center justify-center gap-1.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-xl hover:bg-amber-100 transition">
                <Lightbulb size={14} /> Gerar ideias
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {aula.status !== 'realizada' && (
                <button onClick={() => handleStatus('realizada')}
                  className="flex items-center justify-center gap-1.5 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-xl hover:bg-blue-100 transition">
                  <CheckCircle size={14} /> Realizada
                </button>
              )}
              {aula.status !== 'cancelada' && (
                <button onClick={() => handleStatus('cancelada')}
                  className="flex items-center justify-center gap-1.5 py-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-100 transition col-span-1">
                  <XCircle size={14} /> Cancelar
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEditando(false)} className="py-2 border border-lexiona-200 text-lexiona-600 text-xs font-medium rounded-xl hover:bg-lexiona-50 transition">
              Cancelar
            </button>
            <button onClick={handleSalvar} disabled={salvando} className="py-2 bg-lexiona-600 text-white text-xs font-medium rounded-xl hover:bg-lexiona-700 transition disabled:opacity-60">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}