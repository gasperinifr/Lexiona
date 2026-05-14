import { useState } from 'react'
import { api } from '../services/api'
import { Lightbulb, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GeradorIdeias({ disciplinaId, data, onAplicar, onFechar }) {
  const [ideias, setIdeias] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandida, setExpandida] = useState(null)
  const [gerado, setGerado] = useState(false)

  const gerarIdeias = async () => {
    setLoading(true)
    try {
      const res = await api.post('/agente/gerar-ideias', {
        disciplina_id: disciplinaId,
        data,
      })
      setIdeias(res.data.ideias)
      setGerado(true)
      if (res.data.ideias.length > 0) setExpandida(0)
    } catch (err) {
      toast.error('Erro ao gerar ideias. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Gerador de Ideias</span>
        </div>
        <button onClick={onFechar} className="text-xs text-amber-500 hover:text-amber-700 transition">
          fechar
        </button>
      </div>

      {!gerado && (
        <div className="text-center">
          <p className="text-xs text-amber-700 mb-3">
            A IA vai sugerir 4 ideias de aula com base no contexto da disciplina e no plano ao redor desta data.
          </p>
          <button onClick={gerarIdeias} disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-60">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Gerando ideias...</>
            ) : (
              <><Lightbulb size={16} /> Gerar 4 ideias com IA</>
            )}
          </button>
        </div>
      )}

      {gerado && ideias.length > 0 && (
        <div className="space-y-2">
          {ideias.map((ideia, i) => (
            <div key={i} className="bg-white border border-amber-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandida(expandida === i ? null : i)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-50 transition"
              >
                <span className="text-sm font-medium text-lexiona-800 flex-1 mr-2">{ideia.titulo}</span>
                {expandida === i ? <ChevronUp size={14} className="text-amber-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-amber-500 flex-shrink-0" />}
              </button>

              {expandida === i && (
                <div className="px-3 pb-3 space-y-2 border-t border-amber-100 pt-2">
                  <p className="text-xs text-lexiona-700 leading-relaxed">{ideia.descricao}</p>
                  {ideia.metodologia_sugerida && (
                    <p className="text-xs text-lexiona-500">
                      <strong>Metodologia:</strong> {ideia.metodologia_sugerida}
                    </p>
                  )}
                  {ideia.recursos && (
                    <p className="text-xs text-lexiona-500">
                      <strong>Recursos:</strong> {ideia.recursos}
                    </p>
                  )}
                  {ideia.diferencial && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                      💡 {ideia.diferencial}
                    </p>
                  )}
                  <button onClick={() => onAplicar(ideia)}
                    className="flex items-center justify-center gap-1.5 w-full bg-lexiona-600 hover:bg-lexiona-700 text-white text-xs font-medium py-2 rounded-lg transition mt-2">
                    <Check size={14} /> Aplicar esta ideia
                  </button>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => { setGerado(false); setIdeias([]) }}
            className="text-xs text-amber-600 hover:text-amber-800 transition w-full text-center mt-1">
            ↺ Gerar novas ideias
          </button>
        </div>
      )}
    </div>
  )
}