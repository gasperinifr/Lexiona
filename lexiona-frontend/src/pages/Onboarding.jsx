import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BookOpen, GraduationCap, Calendar, CheckCircle } from 'lucide-react'

const MODALIDADES = [
  'Educação Básica (Fundamental/Médio)',
  'Ensino Superior',
  'Cursos Livres/Técnicos',
  'EJA',
]

const METODOLOGIAS = ['Tradicional', 'ABP', 'Ensino Híbrido', 'Flipped Classroom', 'Sala de Aula Invertida']
const NIVEIS = [
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'medio', label: 'Médio' },
  { value: 'superior', label: 'Superior' },
  { value: 'livre', label: 'Livre/Livre' },
  { value: 'tecnico', label: 'Técnico' },
]
const DIAS_SEMANA = [
  { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sab' },
]

export default function Onboarding() {
  const [passo, setPasso] = useState(1)
  const [loading, setLoading] = useState(false)
  const { professor, updateProfessor } = useAuth()
  const navigate = useNavigate()

  const [step1, setStep1] = useState({ nome: professor?.nome || '', instituicao: '', modalidades: [] })
  const [step2] = useState({ periodo_inicio: '', periodo_fim: '' })
  const [step3, setStep3] = useState({
    nome: '', turma: '', nivel: 'medio', carga_horaria_total: 3600,
    metodologia: 'Tradicional', periodo_inicio: '', periodo_fim: '',
    dias_semana: [], horario_inicio: '', horario_fim: '',
  })

  const toggleModalidade = (m) => {
    setStep1(s => ({
      ...s,
      modalidades: s.modalidades.includes(m) ? s.modalidades.filter(x => x !== m) : [...s.modalidades, m],
    }))
  }

  const toggleDia = (d) => {
    setStep3(s => ({
      ...s,
      dias_semana: s.dias_semana.includes(d) ? s.dias_semana.filter(x => x !== d) : [...s.dias_semana, d],
    }))
  }

  const avancar = async () => {
    if (passo === 1) {
      if (!step1.nome || step1.modalidades.length === 0) {
        toast.error('Preencha seu nome e selecione ao menos uma modalidade')
        return
      }
      setLoading(true)
      try {
        await api.put('/auth/perfil', step1)
        updateProfessor(step1)
        setPasso(2)
      } catch { toast.error('Erro ao salvar perfil') }
      finally { setLoading(false) }
    } else if (passo === 2) {
      setPasso(3)
    } else if (passo === 3) {
      if (!step3.nome || step3.dias_semana.length === 0 || !step3.periodo_inicio) {
        toast.error('Preencha nome da disciplina, período e dias de aula')
        return
      }
      setLoading(true)
      try {
        await api.post('/disciplinas/', {
          ...step3,
          carga_horaria_total: Number(step3.carga_horaria_total),
          horario_inicio: step3.horario_inicio || null,
          horario_fim: step3.horario_fim || null,
        })
        await api.post('/auth/onboarding/concluir')
        updateProfessor({ onboarding_concluido: true })
        toast.success('Tudo pronto! Bem-vindo ao Lexiona 🎉')
        navigate('/')
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Erro ao criar disciplina')
      } finally { setLoading(false) }
    }
  }

  const passos = [
    { num: 1, label: 'Seu perfil', icon: GraduationCap },
    { num: 2, label: 'Período letivo', icon: Calendar },
    { num: 3, label: 'Primeira disciplina', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexiona-50 to-lexiona-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-enter">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-lexiona-900">Configurar o Lexiona</h1>
          <p className="text-lexiona-600 mt-2">3 passos rápidos para começar a planejar</p>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {passos.map((p, i) => (
            <div key={p.num} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                passo === p.num ? 'bg-lexiona-600 text-white' :
                passo > p.num ? 'bg-lexiona-200 text-lexiona-700' : 'bg-white text-lexiona-400 border border-lexiona-200'
              }`}>
                {passo > p.num ? <CheckCircle size={16} /> : <p.icon size={16} />}
                {p.label}
              </div>
              {i < passos.length - 1 && <div className={`w-8 h-0.5 ${passo > p.num ? 'bg-lexiona-400' : 'bg-lexiona-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-lexiona-100 p-8">
          {/* Passo 1 */}
          {passo === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-display font-semibold text-lexiona-900">Sobre você</h2>
              <div>
                <label className="block text-sm font-medium text-lexiona-700 mb-1">Seu nome completo</label>
                <input type="text" value={step1.nome} onChange={e => setStep1({...step1, nome: e.target.value})}
                  placeholder="Prof. Maria Silva" className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-lexiona-700 mb-1">Instituição (opcional)</label>
                <input type="text" value={step1.instituicao} onChange={e => setStep1({...step1, instituicao: e.target.value})}
                  placeholder="Nome da escola ou universidade" className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-lexiona-700 mb-2">Onde você leciona? (marque todas que se aplicam)</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODALIDADES.map(m => (
                    <button key={m} onClick={() => toggleModalidade(m)} className={`p-3 rounded-xl text-sm text-left transition-all border-2 ${
                      step1.modalidades.includes(m) ? 'border-lexiona-500 bg-lexiona-50 text-lexiona-800 font-medium' : 'border-lexiona-100 text-lexiona-600 hover:border-lexiona-300'
                    }`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Passo 2 */}
          {passo === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-display font-semibold text-lexiona-900">Período letivo</h2>
              <p className="text-sm text-lexiona-600">Os feriados nacionais de 2026 já foram carregados automaticamente. Você pode adicionar recesses e feriados locais nas configurações depois.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Início do semestre</label>
                  <input type="date" className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Fim do semestre</label>
                  <input type="date" className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
              </div>
              <div className="bg-lexiona-50 rounded-xl p-4 text-sm text-lexiona-700">
                💡 <strong>Dica:</strong> Cada disciplina terá seu próprio período letivo. As datas que você configura aqui servirão de sugestão inicial.
              </div>
            </div>
          )}

          {/* Passo 3 */}
          {passo === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-display font-semibold text-lexiona-900">Primeira disciplina</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Nome da disciplina *</label>
                  <input type="text" value={step3.nome} onChange={e => setStep3({...step3, nome: e.target.value})}
                    placeholder="ex: Matemática, História, Algoritmos..." className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Turma/Turno</label>
                  <input type="text" value={step3.turma} onChange={e => setStep3({...step3, turma: e.target.value})}
                    placeholder="ex: 9°A — Tarde" className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Nível *</label>
                  <select value={step3.nivel} onChange={e => setStep3({...step3, nivel: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm">
                    {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Início das aulas *</label>
                  <input type="date" value={step3.periodo_inicio} onChange={e => setStep3({...step3, periodo_inicio: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Fim das aulas *</label>
                  <input type="date" value={step3.periodo_fim} onChange={e => setStep3({...step3, periodo_fim: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Metodologia</label>
                  <select value={step3.metodologia} onChange={e => setStep3({...step3, metodologia: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm">
                    {METODOLOGIAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-lexiona-700 mb-2">Dias de aula *</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(d => (
                    <button key={d.value} onClick={() => toggleDia(d.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                      step3.dias_semana.includes(d.value) ? 'border-lexiona-500 bg-lexiona-600 text-white' : 'border-lexiona-100 text-lexiona-600 hover:border-lexiona-300'
                    }`}>{d.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Horário início</label>
                  <input type="time" value={step3.horario_inicio} onChange={e => setStep3({...step3, horario_inicio: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-lexiona-700 mb-1">Horário fim</label>
                  <input type="time" value={step3.horario_fim} onChange={e => setStep3({...step3, horario_fim: e.target.value})}
                    className="w-full px-4 py-3 border border-lexiona-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lexiona-400 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-8">
            {passo > 1 && (
              <button onClick={() => setPasso(p => p - 1)} className="flex-1 py-3 rounded-xl border border-lexiona-200 text-lexiona-700 font-medium hover:bg-lexiona-50 transition">
                Voltar
              </button>
            )}
            <button onClick={avancar} disabled={loading} className="flex-1 bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-60 shadow-sm">
              {loading ? 'Salvando...' : passo === 3 ? '🎉 Concluir configuração' : 'Próximo passo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}