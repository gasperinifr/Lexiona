import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

// ============================================================
// INTERCEPTORS
// ============================================================

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lexiona_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const err = parseApiError(error)

    // 401 → logout silencioso
    if (err.status === 401) {
      localStorage.removeItem('lexiona_token')
      localStorage.removeItem('lexiona_professor')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

// ============================================================
// PARSE DE ERROS
// ============================================================

/**
 * Extrai informações estruturadas de um erro Axios.
 * Suporta o formato Lexiona: { detail, codigo, acao_sugerida }
 */
export function parseApiError(error) {
  const status = error?.response?.status
  const data = error?.response?.data

  // Erro estruturado do Lexiona
  if (data?.detail) {
    return {
      status,
      mensagem: data.detail,
      codigo: data.codigo || null,
      acao_sugerida: data.acao_sugerida || null,
    }
  }

  // Erro de rede / timeout
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      status: 408,
      mensagem: 'A requisição demorou muito. Verifique sua conexão.',
      codigo: 'TIMEOUT',
      acao_sugerida: 'Tente novamente em alguns instantes.',
    }
  }

  if (!error?.response) {
    return {
      status: 0,
      mensagem: 'Sem conexão com o servidor. Verifique sua internet.',
      codigo: 'NETWORK_ERROR',
      acao_sugerida: 'Verifique sua conexão e tente novamente.',
    }
  }

  const mensagensPadrao = {
    400: 'Dados inválidos. Verifique as informações e tente novamente.',
    403: 'Você não tem permissão para esta ação.',
    404: 'O recurso solicitado não foi encontrado.',
    409: 'Conflito com dados existentes.',
    413: 'Arquivo muito grande para envio.',
    422: 'Os dados enviados não são válidos.',
    429: 'Muitas requisições. Aguarde alguns instantes.',
    500: 'Erro interno do servidor. Tente novamente.',
    503: 'Serviço temporariamente indisponível.',
  }

  return {
    status,
    mensagem: mensagensPadrao[status] || 'Ocorreu um erro inesperado.',
    codigo: null,
    acao_sugerida: null,
  }
}

/**
 * Exibe toast de erro inteligente baseado no código de erro.
 * Erros da IA têm formatação especial com ação sugerida.
 */
export function toastErro(error, mensagemPadrao = 'Ocorreu um erro.') {
  const err = parseApiError(error)
  const mensagem = err.mensagem || mensagemPadrao

  // Erros da IA — toast mais longo com ação sugerida
  const codigosIA = ['AI_RATE_LIMIT', 'AI_TOKEN_LIMIT', 'AI_UNAVAILABLE', 'AI_ERROR']
  if (codigosIA.includes(err.codigo) || err.status === 429) {
    toast.error(
      `${mensagem}${err.acao_sugerida ? '\n' + err.acao_sugerida : ''}`,
      {
        duration: 6000,
        style: {
          maxWidth: '380px',
          whiteSpace: 'pre-line',
        },
      }
    )
    return
  }

  // Erros de áudio
  const codigosAudio = ['AUDIO_FORMAT_ERROR', 'AUDIO_TRANSCRIPTION_FAILED']
  if (codigosAudio.includes(err.codigo) || err.status === 422) {
    toast.error(mensagem, { duration: 5000 })
    return
  }

  // Erro genérico
  toast.error(mensagem, { duration: 4000 })
}
