import { useState, useRef, useEffect } from 'react'
import { api } from '../services/api'
import { Send, X, Bot, User, Loader2 } from 'lucide-react'

export default function ChatAgente({ disciplinaId, onFechar }) {
  const [mensagens, setMensagens] = useState([
    { role: 'assistant', content: 'Olá! Posso ajudar você a ajustar o plano desta disciplina. Como posso reorganizar as aulas?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const fimRef = useRef(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const enviar = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMensagens(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/agente/chat', {
        disciplina_id: disciplinaId,
        mensagem: input,
        historico: mensagens.slice(-8),
      })
      setMensagens(m => [...m, { role: 'assistant', content: res.data.resposta }])
    } catch {
      setMensagens(m => [...m, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-lexiona-200 bg-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-lexiona-100 bg-lexiona-50">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-lexiona-600" />
          <span className="text-xs font-medium text-lexiona-700">Assistente pedagógico</span>
        </div>
        <button onClick={onFechar} className="text-lexiona-400 hover:text-lexiona-700 transition">
          <X size={14} />
        </button>
      </div>

      <div className="h-48 overflow-y-auto p-3 space-y-3">
        {mensagens.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' ? 'bg-lexiona-600' : 'bg-lexiona-100'
            }`}>
              {m.role === 'user'
                ? <User size={12} className="text-white" />
                : <Bot size={12} className="text-lexiona-600" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-lexiona-600 text-white' : 'bg-lexiona-50 text-lexiona-800'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-lexiona-100 flex items-center justify-center">
              <Bot size={12} className="text-lexiona-600" />
            </div>
            <div className="bg-lexiona-50 rounded-xl px-3 py-2">
              <Loader2 size={12} className="animate-spin text-lexiona-400" />
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-lexiona-100">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
          placeholder="Ex: mova a revisão para antes da prova..."
          className="flex-1 px-3 py-2 border border-lexiona-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-lexiona-400"
          disabled={loading}
        />
        <button onClick={enviar} disabled={!input.trim() || loading}
          className="p-2 bg-lexiona-600 hover:bg-lexiona-700 text-white rounded-xl transition disabled:opacity-60">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}