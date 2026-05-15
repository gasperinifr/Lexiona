import { useState, useEffect } from 'react'
import { api, toastErro } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart3, BookOpen, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'

const STATUS_COR = {
  planejadas: '#2e9168',
  realizadas: '#1e7452',
  pendentes: '#d97706',
}

function StatCard({ icon: Icon, label, value, cor = 'lexiona' }) {
  const corMap = {
    lexiona: 'bg-lexiona-50 text-lexiona-600',
    amber:   'bg-amber-50 text-amber-600',
    green:   'bg-green-50 text-green-600',
    red:     'bg-red-50 text-red-500',
  }
  return (
    <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${corMap[cor]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-lexiona-900">{value}</p>
        <p className="text-xs text-lexiona-500">{label}</p>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-lexiona-100 rounded-xl shadow-card p-3 text-xs">
      <p className="font-semibold text-lexiona-800 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const [geral, setGeral] = useState(null)
  const [disciplinaId, setDisciplinaId] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  useEffect(() => {
    api.get('/relatorios/geral')
      .then(r => {
        setGeral(r.data)
        if (r.data.disciplinas?.length > 0) {
          setDisciplinaId(r.data.disciplinas[0].id)
        }
      })
      .catch(err => toastErro(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!disciplinaId) return
    setLoadingDetalhe(true)
    api.get(`/relatorios/disciplina/${disciplinaId}`)
      .then(r => setDetalhe(r.data))
      .catch(err => toastErro(err))
      .finally(() => setLoadingDetalhe(false))
  }, [disciplinaId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-lexiona-50 rounded-xl animate-pulse w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-lexiona-50 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-72 bg-lexiona-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-lexiona-900">Relatórios</h1>
        <p className="text-sm text-lexiona-400 mt-0.5">Acompanhe o cumprimento do seu plano de ensino</p>
      </div>

      {/* Stat cards gerais */}
      {geral && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Disciplinas" value={geral.total_disciplinas} />
          <StatCard icon={BarChart3} label="Total de aulas" value={geral.total_aulas} />
          <StatCard icon={CheckCircle2} label="Planejadas" value={geral.total_planejadas} cor="green" />
          <StatCard icon={TrendingUp} label="Realizadas" value={geral.total_realizadas} cor="lexiona" />
        </div>
      )}

      {/* Visão por disciplina */}
      {geral?.disciplinas?.length > 0 && (
        <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">
          {/* Selector */}
          <div className="px-6 py-5 border-b border-lexiona-50 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-display font-bold text-lexiona-900">Progresso por mês</h2>
            <select
              value={disciplinaId}
              onChange={e => setDisciplinaId(e.target.value)}
              className="px-4 py-2 border border-lexiona-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lexiona-400 bg-white"
            >
              {geral.disciplinas.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome}{d.turma ? ` — ${d.turma}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="p-6">
            {loadingDetalhe ? (
              <div className="h-48 bg-lexiona-50 rounded-xl animate-pulse" />
            ) : detalhe?.progresso_mensal?.length > 0 ? (
              <>
                {/* Stats do detalhe */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-lexiona-50 rounded-xl p-3 text-center border border-lexiona-100">
                    <p className="text-lg font-bold text-lexiona-900">{detalhe.resumo.total}</p>
                    <p className="text-xs text-lexiona-500">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-lg font-bold text-green-700">{detalhe.resumo.percentual_planejado}%</p>
                    <p className="text-xs text-green-600">Planejado</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <p className="text-lg font-bold text-amber-700">{detalhe.resumo.taxa_cumprimento}%</p>
                    <p className="text-xs text-amber-600">Cumprimento</p>
                  </div>
                </div>

                {/* Gráfico */}
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={detalhe.progresso_mensal}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    barSize={24}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ed" vertical={false} />
                    <XAxis
                      dataKey="mes_label"
                      tick={{ fontSize: 11, fill: '#6b9e85' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b9e85' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="planejadas" name="Planejadas" fill="#2e9168" radius={[6,6,0,0]} />
                    <Bar dataKey="realizadas" name="Realizadas" fill="#1e7452" radius={[6,6,0,0]} />
                    <Bar dataKey="canceladas" name="Canceladas" fill="#fca5a5" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="flex items-center gap-4 mt-4 justify-center">
                  {[
                    { cor: '#2e9168', label: 'Planejadas' },
                    { cor: '#1e7452', label: 'Realizadas' },
                    { cor: '#fca5a5', label: 'Canceladas' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.cor }} />
                      <span className="text-xs text-lexiona-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-lexiona-400">
                <BarChart3 size={32} className="mx-auto mb-3 text-lexiona-200" />
                <p className="text-sm">Nenhum dado de progresso disponível ainda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visão geral por disciplina */}
      {geral?.disciplinas?.length > 0 && (
        <div className="bg-white rounded-2xl border border-lexiona-100 shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-lexiona-50">
            <h2 className="font-display font-bold text-lexiona-900">Todas as disciplinas</h2>
          </div>
          <div className="divide-y divide-lexiona-50">
            {geral.disciplinas.map(d => (
              <div key={d.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-lexiona-900 text-sm">{d.nome}</p>
                  <p className="text-xs text-lexiona-400">{d.turma} {d.turno && `· ${d.turno}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-lexiona-700">{d.percentual_planejado}%</p>
                  <p className="text-xs text-lexiona-400">{d.planejadas}/{d.total_aulas} aulas</p>
                </div>
                <div className="w-24">
                  <div className="bg-lexiona-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${d.percentual_planejado}%`,
                        backgroundColor: d.percentual_planejado < 30 ? '#d97706' : d.percentual_planejado < 70 ? '#2e9168' : '#1e7452',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!geral || geral.disciplinas.length === 0) && (
        <div className="bg-white rounded-2xl border border-lexiona-100 p-16 text-center shadow-card">
          <BarChart3 size={32} className="mx-auto mb-3 text-lexiona-200" />
          <p className="font-medium text-lexiona-700">Nenhuma disciplina para reportar</p>
          <p className="text-sm text-lexiona-400 mt-1">Crie suas disciplinas para ver relatórios de progresso.</p>
        </div>
      )}
    </div>
  )
}
