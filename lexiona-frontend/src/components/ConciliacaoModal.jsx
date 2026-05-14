import { useState } from 'react'
import { api } from '../services/api'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConciliacaoModal({ dados, insumoId, disciplina, onConfirmar, onVoltar }) {
  const [form, setForm] = useState({
    disciplina_nome: dados?.disciplina_nome || '',
    nivel: dados?.nivel || '',
    metodologia_sugerida: dados?.metodologia_sugerida || '',
    objetivos_gerais: dados?.objetivos_gerais || [],
    unidades_tematicas: dados?.unidades_tematicas || [],
    observacoes: dados?.observacoes || '',
  })
  const [gerando, setGerando] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [progresso, setProgresso] = useState(0)

  const handleConfirmar = async () => {
    setGerando(true)
    try {
      const res = await api.post('/agente/gerar-plano', {
        disciplina_id: disciplina.id,
        insumo_id: insumoId,
        dados_confirmados: form,
      })
      setJobId(res.data.job_id)
      pollJob(res.data.job_id)
    } catch (err) {
      toast.error('Erro ao iniciar geração do plano')
      setGerando(false)
    }
  }

  const pollJob = async (id) => {
    const poll = async () => {
      const res = await api.get(`/agente/status/job/${id}`)
      setProgresso(res.data.progresso)
      if (res.data.status === 'concluido') {
        toast.success(`Plano gerado! ${res.data.aulas_geradas} aulas planejadas 🎉`)
        onConfirmar()
      } else if (res.data.status === 'erro') {
        toast.error('Erro ao gerar plano')
        setGerando(false)
      } else {
        setTimeout(poll, 2000)
      }
    }
    poll()
  }

  if (gerando) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-lexiona-50 rounded-full flex items-center justify-center mx-auto">
          <Loader2 size={28} className="text-lexiona-600 animate-spin" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lexiona-900">Gerando plano de ensino</h3>
          <p className="text-lexiona-500 text-sm mt-1">A IA está distribuindo os conteúdos no calendário...</p>
        </div>
        <div className="bg-lexiona-100 rounded-full h-2 w-full overflow-hidden">
          <div
            className="bg-lexiona-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-sm text-lexiona-600 font-medium">{progresso}% concluído</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center gap-2">
        <CheckCircle size={18} className="text-lexiona-600" />
        <h3 className="font-semibold text-lexiona-900">Confirme os dados extraídos</h3>
      </div>
      <p className="text-sm text-lexiona-500">Verifique e ajuste o que a IA identificou antes de gerar o plano:</p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-lexiona-600 mb-1">Disciplina identificada</label>
          <input type="text" value={form.disciplina_nome}
            onChange={e => setForm({...form, disciplina_nome: e.target.value})}
            className="w-full px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lexiona-600 mb-1">Metodologia sugerida</label>
          <input type="text" value={form.metodologia_sugerida}
            onChange={e => setForm({...form, metodologia_sugerida: e.target.value})}
            className="w-full px-3 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lexiona-600 mb-2">
            Unidades temáticas ({form.unidades_tematicas.length})
          </label>
          {form.unidades_tematicas.map((u, i) => (
            <div key={i} className="bg-lexiona-50 rounded-xl p-3 mb-2">
              <p className="text-sm font-medium text-lexiona-800">{u.titulo}</p>
              <p className="text-xs text-lexiona-500 mt-0.5">
                {u.temas?.join(' · ')} · {u.carga_estimada_aulas} aula(s)
              </p>
            </div>
          ))}
          {form.unidades_tematicas.length === 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-3 rounded-xl">
              <AlertCircle size={14} />
              Nenhuma unidade identificada. O plano será gerado com base no texto completo.
            </div>
          )}
        </div>

        {form.observacoes && (
          <div>
            <label className="block text-xs font-medium text-lexiona-600 mb-1">Observações</label>
            <p className="text-sm text-lexiona-700 bg-lexiona-50 p-3 rounded-xl">{form.observacoes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onVoltar} className="flex-1 py-2.5 border border-lexiona-200 rounded-xl text-lexiona-700 text-sm font-medium hover:bg-lexiona-50 transition">
          ← Voltar
        </button>
        <button onClick={handleConfirmar}
          className="flex-1 bg-lexiona-600 hover:bg-lexiona-700 text-white text-sm font-medium py-2.5 rounded-xl transition shadow-sm">
          Gerar plano com IA 🚀
        </button>
      </div>
    </div>
  )
}