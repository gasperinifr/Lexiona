import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import {
  Mic, MicOff, FileUp, Type, Upload, Loader2,
  CheckCircle2, StopCircle, AlertCircle,
} from 'lucide-react'

const ABAS = [
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'arquivo', label: 'Arquivo', icon: FileUp },
  { id: 'audio', label: 'Áudio', icon: Mic },
]

export default function EntradaDados({ disciplinaId, onProcessado }) {
  const [aba, setAba] = useState('texto')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  // Áudio
  const [gravando, setGravando] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // Arquivo
  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
    onDrop: () => {},
  })

  // ── ÁUDIO ─────────────────────────────────────────────

  /**
   * Detecta o melhor formato de áudio suportado pelo navegador.
   * Prioridade: ogg/opus (suportado pelo Groq), depois mp4, depois webm com codec opus.
   * O webm puro não é suportado pelo Groq, mas webm com opus pode ser renomeado para ogg.
   */
  function getMimeType() {
    const tipos = [
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/webm;codecs=opus', // Chrome — renomeado para ogg no envio
      'audio/webm',
    ]
    return tipos.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
  }

  async function iniciarGravacao() {
    setAudioBlob(null)
    setAudioDuration(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob({ blob, mimeType })
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250)
      setGravando(true)

      // Timer
      let secs = 0
      timerRef.current = setInterval(() => {
        secs++
        setAudioDuration(secs)
        if (secs >= 120) pararGravacao() // máx 2 min
      }, 1000)
    } catch (err) {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  function pararGravacao() {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    clearInterval(timerRef.current)
    setGravando(false)
  }

  function formatDuration(secs) {
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }

  // ── PROCESSAMENTO ─────────────────────────────────────

  async function handleProcessar() {
    if (!disciplinaId) {
      toast.error('Selecione uma disciplina antes de processar o conteúdo.')
      return
    }
    setLoading(true)
    try {
      let res

      if (aba === 'texto') {
        if (texto.trim().length < 20) { toast.error('O texto está muito curto. Adicione mais conteúdo.'); return }
        res = await api.post('/agente/processar-texto', { disciplina_id: disciplinaId, texto })
      }

      if (aba === 'arquivo') {
        if (!acceptedFiles[0]) { toast.error('Selecione um arquivo PDF ou DOCX.'); return }
        const form = new FormData()
        form.append('disciplina_id', disciplinaId)
        form.append('arquivo', acceptedFiles[0])
        res = await api.post('/agente/processar-arquivo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      if (aba === 'audio') {
        if (!audioBlob) { toast.error('Grave um áudio antes de processar.'); return }

        const { blob, mimeType } = audioBlob

        // Determinar nome do arquivo com extensão correta para o backend
        // webm com opus → enviamos como .ogg (o backend aceita e o Groq processa normalmente)
        let filename = 'gravacao'
        if (mimeType.includes('ogg')) filename += '.ogg'
        else if (mimeType.includes('mp4')) filename += '.mp4'
        else if (mimeType.includes('webm')) filename += '.ogg' // renomear para ogg
        else filename += '.ogg'

        const form = new FormData()
        form.append('disciplina_id', disciplinaId)
        form.append('audio', blob, filename)
        res = await api.post('/agente/processar-audio', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        if (res.data.texto_transcrito) {
          toast.success(`Transcrição concluída: ${res.data.texto_transcrito.slice(0, 60)}...`)
        }
      }

      onProcessado(res.data)
    } catch (err) {
      toastErro(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-lexiona-50">
        <h2 className="font-display font-bold text-lexiona-900">Adicionar conteúdo</h2>
        <p className="text-xs text-lexiona-400 mt-0.5">
          Envie sua ementa, plano de curso ou descreva verbalmente o que quer planejar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-lexiona-100">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all border-b-2 ${
              aba === id
                ? 'border-lexiona-600 text-lexiona-700 bg-lexiona-50/50'
                : 'border-transparent text-lexiona-400 hover:text-lexiona-600 hover:bg-lexiona-50/30'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">

        {/* TEXTO */}
        {aba === 'texto' && (
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Cole ou digite aqui sua ementa, objetivos, unidades temáticas, lista de conteúdos ou qualquer texto que descreva o que vai ensinar nesta disciplina..."
            rows={8}
            className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white resize-none leading-relaxed"
          />
        )}

        {/* ARQUIVO */}
        {aba === 'arquivo' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              acceptedFiles[0]
                ? 'border-lexiona-400 bg-lexiona-50'
                : 'border-lexiona-200 hover:border-lexiona-400 hover:bg-lexiona-50/40'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 bg-lexiona-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Upload size={20} className="text-lexiona-600" />
            </div>
            {acceptedFiles[0] ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 size={20} className="text-lexiona-600" />
                <p className="text-sm font-semibold text-lexiona-800">{acceptedFiles[0].name}</p>
                <p className="text-xs text-lexiona-400">
                  {(acceptedFiles[0].size / 1024).toFixed(0)} KB
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-lexiona-700">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-lexiona-400 mt-1">PDF ou DOCX · Máx. 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* ÁUDIO */}
        {aba === 'audio' && (
          <div className="space-y-4">
            <div className="bg-lexiona-50 border border-lexiona-100 rounded-2xl p-6 text-center space-y-4">

              {/* Botão gravar */}
              {!gravando && !audioBlob && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-white border-2 border-lexiona-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Mic size={26} className="text-lexiona-500" />
                  </div>
                  <p className="text-sm text-lexiona-600 font-medium">
                    Descreva verbalmente o que quer planejar
                  </p>
                  <p className="text-xs text-lexiona-400">
                    Fale sobre os temas, objetivos, conteúdos — a IA vai transcrever e estruturar.
                  </p>
                  <button
                    onClick={iniciarGravacao}
                    className="bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2 mx-auto"
                  >
                    <Mic size={16} /> Iniciar gravação
                  </button>
                </div>
              )}

              {/* Gravando */}
              {gravando && (
                <div className="space-y-3">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-40" />
                    <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <Mic size={26} className="text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-600">
                    Gravando — {formatDuration(audioDuration)}
                  </p>
                  <p className="text-xs text-lexiona-400">Máximo: 2 minutos</p>
                  <button
                    onClick={pararGravacao}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2 mx-auto"
                  >
                    <StopCircle size={16} /> Parar gravação
                  </button>
                </div>
              )}

              {/* Áudio pronto */}
              {audioBlob && !gravando && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-green-100 border-2 border-green-300 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={26} className="text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-lexiona-800">
                    Gravação pronta — {formatDuration(audioDuration)}
                  </p>
                  <button
                    onClick={() => { setAudioBlob(null); setAudioDuration(0) }}
                    className="text-xs text-lexiona-500 hover:text-lexiona-700 underline underline-offset-2"
                  >
                    Gravar novamente
                  </button>
                </div>
              )}
            </div>

            {/* Aviso de compatibilidade */}
            <div className="flex items-start gap-2 px-1">
              <AlertCircle size={13} className="text-lexiona-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-lexiona-400">
                Use um ambiente silencioso para melhor transcrição. Funciona em Chrome, Firefox e Safari.
              </p>
            </div>
          </div>
        )}

        {/* Botão processar */}
        <button
          onClick={handleProcessar}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processando com IA...
            </>
          ) : (
            'Analisar com IA →'
          )}
        </button>
      </div>
    </div>
  )
}
