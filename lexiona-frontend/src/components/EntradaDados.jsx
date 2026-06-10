import { useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { api, toastErro } from '../services/api'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FileUp,
  Loader2,
  Mic,
  StopCircle,
  Type,
  Upload,
} from 'lucide-react'

const ABAS = [
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'arquivo', label: 'Arquivo', icon: FileUp },
  { id: 'audio', label: 'Audio', icon: Mic },
]

export default function EntradaDados({ disciplinaId, onProcessado }) {
  const [aba, setAba] = useState('texto')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  })

  function getMimeType() {
    const tipos = [
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
    ]
    return tipos.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
  }

  async function iniciarGravacao() {
    setAudioBlob(null)
    setAudioFile(null)
    setAudioDuration(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob({ blob, mimeType })
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start(250)
      setGravando(true)

      let secs = 0
      timerRef.current = setInterval(() => {
        secs += 1
        setAudioDuration(secs)
        if (secs >= 120) pararGravacao()
      }, 1000)
    } catch {
      toast.error('Nao foi possivel acessar o microfone. Verifique as permissoes do navegador.')
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

  function handleAudioFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setAudioFile(file)
    setAudioBlob(null)
    setAudioDuration(0)
  }

  async function handleProcessar() {
    if (!disciplinaId) {
      toast.error('Selecione uma disciplina antes de processar o conteudo.')
      return
    }

    setLoading(true)
    try {
      let res

      if (aba === 'texto') {
        if (texto.trim().length < 20) {
          toast.error('O texto esta muito curto. Adicione mais conteudo.')
          return
        }
        res = await api.post('/agente/processar-texto', { disciplina_id: disciplinaId, texto })
      }

      if (aba === 'arquivo') {
        if (!acceptedFiles[0]) {
          toast.error('Selecione um arquivo PDF ou DOCX.')
          return
        }
        const form = new FormData()
        form.append('disciplina_id', disciplinaId)
        form.append('arquivo', acceptedFiles[0])
        res = await api.post('/agente/processar-arquivo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      if (aba === 'audio') {
        if (!audioBlob && !audioFile) {
          toast.error('Grave ou selecione um audio antes de processar.')
          return
        }

        let arquivoEnvio = audioFile
        let filename = audioFile?.name

        if (!arquivoEnvio && audioBlob) {
          const { blob, mimeType } = audioBlob
          arquivoEnvio = blob
          filename = 'gravacao'
          if (mimeType.includes('ogg')) filename += '.ogg'
          else if (mimeType.includes('mp4')) filename += '.mp4'
          else if (mimeType.includes('webm')) filename += '.ogg'
          else filename += '.ogg'
        }

        const form = new FormData()
        form.append('disciplina_id', disciplinaId)
        form.append('audio', arquivoEnvio, filename)
        res = await api.post('/agente/processar-audio', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        if (res.data.texto_transcrito) {
          toast.success(`Transcricao concluida: ${res.data.texto_transcrito.slice(0, 60)}...`)
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
        <h2 className="font-display font-bold text-lexiona-900">Adicionar conteudo</h2>
        <p className="text-xs text-lexiona-400 mt-0.5">
          Envie ementa, plano de curso, arquivo ou audio para a IA estruturar o planejamento.
        </p>
      </div>

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
        {aba === 'texto' && (
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Cole ou digite aqui ementa, objetivos, unidades tematicas, lista de conteudos ou qualquer texto que descreva o que vai ensinar."
            rows={8}
            className="w-full px-4 py-3 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white resize-none leading-relaxed"
          />
        )}

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
                <p className="text-xs text-lexiona-400 mt-1">PDF ou DOCX</p>
              </>
            )}
          </div>
        )}

        {aba === 'audio' && (
          <div className="space-y-4">
            <div className="bg-lexiona-50 border border-lexiona-100 rounded-2xl p-6 text-center space-y-4">
              {!gravando && !audioBlob && !audioFile && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-white border-2 border-lexiona-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Mic size={26} className="text-lexiona-500" />
                  </div>
                  <p className="text-sm text-lexiona-600 font-medium">
                    Grave uma explicacao ou envie um arquivo de audio
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <button
                      onClick={iniciarGravacao}
                      className="bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                    >
                      <Mic size={16} /> Gravar
                    </button>
                    <label className="border border-lexiona-200 bg-white hover:bg-lexiona-50 text-lexiona-700 font-semibold px-5 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer">
                      <FileAudio size={16} /> Enviar audio
                      <input
                        type="file"
                        accept="audio/*,.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.ogg,.opus,.flac"
                        className="hidden"
                        onChange={handleAudioFile}
                      />
                    </label>
                  </div>
                </div>
              )}

              {gravando && (
                <div className="space-y-3">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-40" />
                    <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <Mic size={26} className="text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-600">
                    Gravando - {formatDuration(audioDuration)}
                  </p>
                  <button
                    onClick={pararGravacao}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2 mx-auto"
                  >
                    <StopCircle size={16} /> Parar gravacao
                  </button>
                </div>
              )}

              {(audioBlob || audioFile) && !gravando && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-green-100 border-2 border-green-300 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={26} className="text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-lexiona-800">
                    {audioFile ? audioFile.name : `Gravacao pronta - ${formatDuration(audioDuration)}`}
                  </p>
                  <button
                    onClick={() => { setAudioBlob(null); setAudioFile(null); setAudioDuration(0) }}
                    className="text-xs text-lexiona-500 hover:text-lexiona-700 underline underline-offset-2"
                  >
                    Escolher outro audio
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 px-1">
              <AlertCircle size={13} className="text-lexiona-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-lexiona-400">
                Use um ambiente silencioso. Formatos comuns como MP3, WAV, M4A, OGG e FLAC sao aceitos.
              </p>
            </div>
          </div>
        )}

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
            'Analisar com IA'
          )}
        </button>
      </div>
    </div>
  )
}
