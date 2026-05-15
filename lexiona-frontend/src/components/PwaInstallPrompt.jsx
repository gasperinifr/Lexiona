import { useState, useEffect } from 'react'
import { Smartphone, X } from 'lucide-react'

export default function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Não mostrar se já rejeitado ou se está em modo standalone (já instalado)
    const rejeitado = localStorage.getItem('pwa_prompt_rejected')
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (rejeitado || standalone) return

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setPrompt(null)
  }

  function handleRejeitar() {
    setVisible(false)
    localStorage.setItem('pwa_prompt_rejected', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-forest-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-lexiona-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instale o Lexiona</p>
          <p className="text-xs text-lexiona-200 mt-0.5">
            Acesse mais rápido pelo seu dispositivo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-lexiona-500 hover:bg-lexiona-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Instalar
          </button>
          <button
            onClick={handleRejeitar}
            className="p-1.5 text-lexiona-300 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
