import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function ProgressoBar({ disciplina }) {
  const [progresso, setProgresso] = useState(null)

  useEffect(() => {
    api.get(`/disciplinas/${disciplina.id}/progresso`)
      .then(r => setProgresso(r.data))
      .catch(() => {})
  }, [disciplina.id])

  if (!progresso) return null

  const pct = progresso.percentual_planejado

  return (
    <div className="bg-white border border-lexiona-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-lexiona-900 truncate">{disciplina.nome}</p>
          {disciplina.turma && <p className="text-xs text-lexiona-400">{disciplina.turma}</p>}
        </div>
        <span className="text-sm font-semibold text-lexiona-700 ml-3 flex-shrink-0">{pct}%</span>
      </div>
      <div className="bg-lexiona-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: pct < 30 ? '#d97706' : pct < 70 ? '#2e9168' : '#1e7452',
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-lexiona-400">{progresso.planejadas} planejadas</span>
        <span className="text-xs text-lexiona-400">{progresso.total} aulas no total</span>
      </div>
    </div>
  )
}