import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function ProgressoBar({ disciplina }) {
  const [progresso, setProgresso] = useState(null)

  useEffect(() => {
    if (!disciplina?.id) return
    api.get(`/disciplinas/${disciplina.id}/progresso`)
      .then(r => setProgresso(r.data))
      .catch(() => {})
  }, [disciplina?.id])

  if (!progresso || progresso.total === 0) return null

  const pct = progresso.percentual_planejado
  const corBarra =
    pct < 30 ? 'bg-red-400' :
    pct < 70 ? 'bg-amber-400' :
               'bg-lexiona-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-lexiona-500 font-medium">Planejamento</span>
        <span className="font-semibold text-lexiona-700">{pct}%</span>
      </div>

      <div className="w-full bg-lexiona-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${corBarra}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-lexiona-400">
        <span>{progresso.planejadas} planejadas</span>
        <span className="text-lexiona-200">·</span>
        <span>{progresso.realizadas} realizadas</span>
        <span className="text-lexiona-200">·</span>
        <span>{progresso.pendentes} pendentes</span>
      </div>
    </div>
  )
}
