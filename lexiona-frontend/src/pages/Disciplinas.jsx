import { useState, useEffect } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, BookOpen, Trash2, Edit3 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const METODOLOGIAS = ['Tradicional', 'ABP', 'Ensino Híbrido', 'Flipped Classroom', 'Sala de Aula Invertida']
const NIVEIS = [
  { value: 'fundamental', label: 'Fundamental' }, { value: 'medio', label: 'Médio' },
  { value: 'superior', label: 'Superior' }, { value: 'livre', label: 'Livre' }, { value: 'tecnico', label: 'Técnico' },
]
const DIAS_SEMANA = [
  { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sab' },
]

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '', turma: '', nivel: 'medio', metodologia: 'Tradicional',
    carga_horaria_total: 3600, periodo_inicio: '', periodo_fim: '',
    dias_semana: [], horario_inicio: '', horario_fim: '',
  })

  useEffect(() => { carregarDisciplinas() }, [])

  const carregarDisciplinas = async () => {
    try {
      const res = await api.get('/disciplinas/')
      setDisciplinas(res.data)
    } catch { toast.error('Erro ao carregar disciplinas') }
  }

  const toggleDia = (d) => setForm(f => ({
    ...f, dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter(x => x !== d) : [...f.dias_semana, d],
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome || !form.periodo_inicio || !form.periodo_fim || form.dias_semana.length === 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)
    try {
      await api.post('/disciplinas/', {
        ...form,
        carga_horaria_total: Number(form.carga_horaria_total),
        horario_inicio: form.horario_inicio || null,
        horario_fim: form.horario_fim || null,
      })
      toast.success('Disciplina criada com sucesso!')
      setMostrarForm(false)
      setForm({ nome: '', turma: '', nivel: 'medio', metodologia: 'Tradicional', carga_horaria_total: 3600, periodo_inicio: '', periodo_fim: '', dias_semana: [], horario_inicio: '', horario_fim: '' })
      carregarDisciplinas()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar disciplina')
    } finally { setLoading(false) }
  }

  const handleDesativar = async (id) => {
    if (!confirm('Deseja remover esta disciplina? As aulas associadas também serão removidas.')) return
    try {
      await api.delete(`/disciplinas/${id}`)
      toast.success('Disciplina removida')
      carregarDisciplinas()
    } catch { toast.error('Erro ao remover disciplina') }
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-lexiona-900">Minhas disciplinas</h1>
          <p className="text-lexiona-500 text-sm mt-1">{disciplinas.length} disciplina(s) cadastrada(s)</p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <Plus size={18} /> Nova disciplina
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-white border border-lexiona-100 rounded-2xl p-6 animate-enter">
          <h2 className="text-lg font-display font-semibold text-lexiona-900 mb-4">Nova disciplina</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Nome da disciplina *</label>
              <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                placeholder="ex: Matemática, Algoritmos..." className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Turma/Turno</label>
              <input type="text" value={form.turma} onChange={e => setForm({...form, turma: e.target.value})}
                placeholder="ex: 9°A — Tarde" className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Nível *</label>
              <select value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400">
                {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Metodologia</label>
              <select value={form.metodologia} onChange={e => setForm({...form, metodologia: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400">
                {METODOLOGIAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Carga horária (minutos)</label>
              <input type="number" value={form.carga_horaria_total} onChange={e => setForm({...form, carga_horaria_total: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Início *</label>
              <input type="date" value={form.periodo_inicio} onChange={e => setForm({...form, periodo_inicio: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Fim *</label>
              <input type="date" value={form.periodo_fim} onChange={e => setForm({...form, periodo_fim: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-lexiona-700 mb-2">Dias de aula *</label>
              <div className="flex gap-2">
                {DIAS_SEMANA.map(d => (
                  <button type="button" key={d.value} onClick={() => toggleDia(d.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition border-2 ${
                      form.dias_semana.includes(d.value) ? 'border-lexiona-500 bg-lexiona-600 text-white' : 'border-lexiona-100 text-lexiona-600 hover:border-lexiona-300'
                    }`}>{d.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Horário início</label>
              <input type="time" value={form.horario_inicio} onChange={e => setForm({...form, horario_inicio: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-lexiona-700 mb-1">Horário fim</label>
              <input type="time" value={form.horario_fim} onChange={e => setForm({...form, horario_fim: e.target.value})}
                className="w-full px-4 py-2.5 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400" />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 py-2.5 border border-lexiona-200 rounded-xl text-lexiona-700 text-sm font-medium hover:bg-lexiona-50 transition">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 bg-lexiona-600 hover:bg-lexiona-700 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-60 shadow-sm">
                {loading ? 'Criando...' : 'Criar disciplina'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {disciplinas.length === 0 && !mostrarForm ? (
        <div className="bg-white border border-lexiona-100 rounded-2xl p-12 text-center">
          <BookOpen className="mx-auto text-lexiona-200 mb-4" size={48} />
          <p className="text-lexiona-500 font-medium">Nenhuma disciplina cadastrada ainda</p>
          <p className="text-lexiona-400 text-sm mt-1">Clique em "Nova disciplina" para começar</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disciplinas.map(d => (
            <div key={d.id} className="bg-white border border-lexiona-100 rounded-2xl p-5 hover:shadow-sm transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lexiona-900 truncate">{d.nome}</h3>
                  {d.turma && <p className="text-xs text-lexiona-500 mt-0.5">{d.turma}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                  <button onClick={() => handleDesativar(d.id)} className="p-1.5 text-lexiona-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="text-xs bg-lexiona-50 text-lexiona-700 px-2 py-0.5 rounded-full font-medium capitalize">{d.nivel}</span>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{d.metodologia}</span>
                </div>
                <p className="text-xs text-lexiona-400 mt-2">
                  {d.periodo_inicio && d.periodo_fim && (
                    <>📅 {format(parseISO(d.periodo_inicio), 'dd/MM', { locale: ptBR })} – {format(parseISO(d.periodo_fim), 'dd/MM/yyyy', { locale: ptBR })}</>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}