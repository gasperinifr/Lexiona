import { useState, useCallback, useRef } from 'react'
import { api } from '../services/api'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { X, FileText, Mic, Upload, Loader2, CheckCircle } from 'lucide-react'
import ConciliacaoModal from './ConciliacaoModal'

const TABS = [
  { id: 'texto', label: '✏️ Texto livre', icon: FileText },
  { id: 'arquivo', label: '📎 Arquivo', icon: Upload },
  { id: 'audio', label: '🎙️ Áudio', icon: Mic },
]

export default function EntradaDados({ disciplina, onClose, onPlanoGerado }) {
  const [tab, setTab] = useState('texto')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [insumoId, setInsumoId] = useState(null)
  const [insumoData, setInsumoData] = useState(null)
  const [mostrarConciliacao, setMostrarConciliacao] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const processar = async (formData, endpoint) => {
    setLoading(true)
    try {
      const res = await api.post(endpoint, formData, {
        headers: endpoint.includes('audio') || endpoint.includes('arquivo')
          ? { 'Content-Type': 'multipart/form-data' }
          : {},
      })
      setInsumoId(res.data.insumo_id)
      pollStatus(res.data.insumo_id)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao processar')
      setLoading(false)
    }
  }

  const pollStatus = async (id) => {
    const poll = async () => {
      try {
        const res = await api.get(`/agente/status/insumo/${id}`)
        if (res.data.status === 'concluido') {
          setInsumoData(res.data)
          setLoading(false)
          setMostrarConciliacao(true)
        } else if (res.data.status === 'erro') {
          toast.error(`Erro: ${res.data.erro_mensagem || 'Falha no processamento'}`)
          setLoading(false)
        } else {
          setTimeout(poll, 2500)
        }
      } catch {
        setLoading(false)
      }
    }
    poll()
  }

  const handleTexto = () => {
    if (!texto.trim() || texto.length < 10) {
      toast.error('Digite pelo menos 10 caracteres')
      return
    }
    processar({ disciplina_id: disciplina.id, texto }, '/agente/processar-texto')
  }

  const onDrop = useCallback((files) => {
    if (!files[0]) return
    const fd = new FormData()
    fd.append('disciplina_id', disciplina.id)
    fd.append('arquivo', files[0])
    processar(fd, '/agente/processar-arquivo')
  }, [disciplina.id])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
  })

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('disciplina_id', disciplina.id)
        fd.append('audio', blob, 'gravacao.webm')
        processar(fd, '/agente/processar-audio')
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setGravando(true)
    } catch {
      toast.error('Permissão de microfone negada ou microfone não encontrado')
    }
  }

  const pararGravacao = () => {
    mediaRecorderRef.current?.stop()
    setGravando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-enter">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-lexiona-100">
          <div>
            <h2 className="font-display font-semibold text-lexiona-900">Adicionar conteúdo programático</h2>
            <p className="text-xs text-lexiona-500 mt-0.5">{disciplina.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-lexiona-400 hover:text-lexiona-700 rounded-lg hover:bg-lexiona-50 transition">
            <X size={18} />
          </button>
        </div>

        {!mostrarConciliacao ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-lexiona-100">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} disabled={loading}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    tab === t.id ? 'text-lexiona-700 border-b-2 border-lexiona-600' : 'text-lexiona-400 hover:text-lexiona-600'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Texto */}
              {tab === 'texto' && (
                <div className="space-y-4">
                  <p className="text-sm text-lexiona-600">Cole ou digite a ementa, objetivos ou qualquer descrição da disciplina. A IA vai estruturar automaticamente.</p>
                  <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    rows={6}
                    placeholder="Ex: Esta disciplina aborda os fundamentos de algoritmos e estruturas de dados, incluindo listas, pilhas, filas, árvores e grafos. O objetivo é que o aluno seja capaz de..."
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 resize-none"
                    disabled={loading}
                  />
                  <button onClick={handleTexto} disabled={loading || !texto.trim()}
                    className="w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Processando...</> : 'Processar com IA →'}
                  </button>
                </div>
              )}

              {/* Arquivo */}
              {tab === 'arquivo' && (
                <div className="space-y-4">
                  <p className="text-sm text-lexiona-600">Faça upload de PDF ou DOCX com a ementa da disciplina.</p>
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-lexiona-500 bg-lexiona-50' : 'border-lexiona-200 hover:border-lexiona-400 hover:bg-lexiona-50'
                  } ${loading ? 'pointer-events-none opacity-60' : ''}`}>
                    <input {...getInputProps()} />
                    <Upload className="mx-auto text-lexiona-300 mb-3" size={32} />
                    {isDragActive ? (
                      <p className="text-lexiona-600 font-medium text-sm">Solte o arquivo aqui</p>
                    ) : (
                      <>
                        <p className="text-lexiona-600 font-medium text-sm">Arraste um arquivo ou clique para selecionar</p>
                        <p className="text-lexiona-400 text-xs mt-1">PDF ou DOCX — máx. 10 MB</p>
                      </>
                    )}
                  </div>
                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-lexiona-600 text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      Extraindo texto e processando com IA...
                    </div>
                  )}
                </div>
              )}

              {/* Áudio */}
              {tab === 'audio' && (
                <div className="space-y-4">
                  <p className="text-sm text-lexiona-600">Grave sua voz descrevendo os tópicos da disciplina. A transcrição será feita automaticamente.</p>
                  <div className="text-center py-6">
                    {!gravando ? (
                      <button onClick={iniciarGravacao} disabled={loading}
                        className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full text-white flex items-center justify-center mx-auto transition shadow-lg disabled:opacity-60">
                        <Mic size={36} />
                      </button>
                    ) : (
                      <button onClick={pararGravacao}
                        className="w-24 h-24 bg-red-700 rounded-full text-white flex items-center justify-center mx-auto animate-pulse-soft shadow-lg">
                        <div className="w-8 h-8 bg-white rounded-sm" />
                      </button>
                    )}
                    <p className="text-sm text-lexiona-500 mt-4">
                      {gravando ? '🔴 Gravando... Clique para parar' : 'Clique no microfone para começar'}
                    </p>
                  </div>
                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-lexiona-600 text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      Transcrevendo e processando com IA...
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <ConciliacaoModal
            dados={insumoData?.conteudo_estruturado}
            insumoId={insumoId}
            disciplina={disciplina}
            onConfirmar={onPlanoGerado}
            onVoltar={() => setMostrarConciliacao(false)}
          />
        )}
      </div>
    </div>
  )
}