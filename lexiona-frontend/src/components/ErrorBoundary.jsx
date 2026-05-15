import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Lexiona — erro inesperado:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">

          {/* Ícone */}
          <div className="w-20 h-20 bg-lexiona-50 rounded-2xl flex items-center justify-center mx-auto border border-lexiona-100">
            <AlertTriangle size={32} className="text-lexiona-400" />
          </div>

          {/* Texto */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-lexiona-900">
              Algo deu errado
            </h1>
            <p className="text-lexiona-500 text-sm leading-relaxed">
              Ocorreu um erro inesperado no Lexiona. Suas aulas e dados estão seguros —
              isso é apenas um problema temporário de interface.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-lexiona-400 font-mono bg-lexiona-50 rounded-lg px-3 py-2 mt-3 text-left break-all">
                {this.state.error.message}
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="flex items-center justify-center gap-2 w-full bg-lexiona-600 hover:bg-lexiona-700 text-white font-medium py-3 rounded-xl transition"
            >
              <RefreshCw size={16} />
              Recarregar página
            </button>
            <a
              href="/app"
              className="flex items-center justify-center gap-2 w-full bg-lexiona-50 hover:bg-lexiona-100 text-lexiona-700 font-medium py-3 rounded-xl transition border border-lexiona-100"
            >
              <Home size={16} />
              Ir para o Dashboard
            </a>
          </div>

          <p className="text-xs text-lexiona-300">
            Se o problema persistir, tente limpar o cache do navegador.
          </p>
        </div>
      </div>
    )
  }
}
