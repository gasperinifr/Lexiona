import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Sparkles, Calendar, Bell, MessageSquare,
  ChevronDown, Check, ArrowRight, Menu, X, Lightbulb,
  FileText, Mic, Upload, Star
} from 'lucide-react'

// ============================================================
// Hook: detectar elemento no viewport para animações de scroll
// ============================================================
function useReveal(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15, ...options }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}

// ============================================================
// Componente: Mockup da UI (hero visual)
// ============================================================
function HeroMockup() {
  return (
    <div className="relative w-full h-[480px] select-none">
      {/* Card Agenda — principal */}
      <div
        className="absolute top-0 right-0 w-72 bg-white rounded-2xl shadow-2xl p-5 border border-lexiona-100 lp-float"
        style={{ zIndex: 3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-lexiona-500 font-medium">Hoje, seg 13 de maio</p>
            <p className="text-sm font-display font-semibold text-lexiona-900 mt-0.5">Agenda do Dia</p>
          </div>
          <div className="w-8 h-8 bg-lexiona-600 rounded-xl flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
        </div>
        {[
          { hora: '08h00', disc: 'Matemática — 9ºA', tema: 'Equações do 2º grau', cor: 'bg-lexiona-500', status: 'planejada' },
          { hora: '10h00', disc: 'Física — 2ºB', tema: 'Leis de Newton', cor: 'bg-blue-500', status: 'planejada' },
          { hora: '14h00', disc: 'Matemática — 8ºC', tema: '⏳ Sem plano ainda', cor: 'bg-amber-400', status: 'pendente' },
        ].map((a, i) => (
          <div key={i} className="flex gap-3 mb-3 last:mb-0">
            <div className={`w-1 rounded-full flex-shrink-0 ${a.cor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-lexiona-400">{a.hora} · {a.disc}</p>
              <p className="text-xs font-medium text-lexiona-800 truncate mt-0.5">{a.tema}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Card Calendário — de trás */}
      <div
        className="absolute top-24 left-0 w-64 bg-white rounded-2xl shadow-xl p-4 border border-lexiona-100 lp-float-delay"
        style={{ zIndex: 2 }}
      >
        <p className="text-xs font-medium text-lexiona-500 mb-3">Maio 2026</p>
        <div className="grid grid-cols-5 gap-1">
          {['S','T','Q','Q','S'].map((d, i) => (
            <p key={i} className="text-center text-xs text-lexiona-400 font-medium">{d}</p>
          ))}
          {[null, null, null, null, 1, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22].map((d, i) => (
            <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs transition ${
              d === 13 ? 'bg-lexiona-600 text-white font-bold' :
              [5,6,12,19,20].includes(d) ? 'bg-lexiona-100 text-lexiona-700 font-medium' :
              d ? 'text-lexiona-500' : ''
            }`}>
              {d || ''}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-lexiona-100 flex gap-2">
          <span className="flex items-center gap-1 text-xs text-lexiona-600"><span className="w-2 h-2 rounded-full bg-lexiona-500 inline-block"/>Planejada</span>
          <span className="flex items-center gap-1 text-xs text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Pendente</span>
        </div>
      </div>

      {/* Card Gerador de Ideias — menor, embaixo direita */}
      <div
        className="absolute bottom-0 right-4 w-60 bg-amber-50 border border-amber-200 rounded-2xl shadow-xl p-4 lp-float-slow"
        style={{ zIndex: 4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={14} className="text-amber-600" />
          <p className="text-xs font-semibold text-amber-800">Gerador de Ideias ✨</p>
        </div>
        <div className="space-y-1.5">
          {['Debate em grupos sobre a fórmula', 'Resolução de problemas reais', 'Quiz interativo de fixação'].map((idea, i) => (
            <div key={i} className="bg-white border border-amber-100 rounded-xl px-3 py-2 text-xs text-lexiona-700 flex items-center gap-2">
              <span className="text-amber-500 font-bold">{i + 1}.</span> {idea}
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe decorativo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-lexiona-300/20 blur-xl" />
    </div>
  )
}

// ============================================================
// Componente principal: Landing Page
// ============================================================
export default function LandingPage() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [navSolido, setNavSolido] = useState(false)

  const [refDores, visibleDores] = useReveal()
  const [refFeatures, visibleFeatures] = useReveal()
  const [refRF23, visibleRF23] = useReveal()
  const [refComo, visibleComo] = useReveal()
  const [refDepo, visibleDepo] = useReveal()
  const [refGratis, visibleGratis] = useReveal()

  useEffect(() => {
    const handleScroll = () => setNavSolido(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: <Sparkles size={22} className="text-lexiona-500" />,
      titulo: 'Plano gerado pela IA',
      descricao: 'Cole a ementa, faça upload do PDF ou grave sua voz. Em segundos, a IA distribui todos os conteúdos nas datas letivas.',
    },
    {
      icon: <Calendar size={22} className="text-lexiona-500" />,
      titulo: 'Calendário interativo',
      descricao: 'Visualize o semestre inteiro de uma vez. Aulas planejadas em verde, pendentes em amarelo. Tudo num único lugar.',
    },
    {
      icon: <Bell size={22} className="text-lexiona-500" />,
      titulo: 'Agenda do dia',
      descricao: 'Abra o Lexiona de manhã e veja exatamente o que você vai lecionar. Com objetivos, recursos e metodologia prontos.',
    },
    {
      icon: <MessageSquare size={22} className="text-lexiona-500" />,
      titulo: 'Chat para ajustes',
      descricao: 'Precisou mudar algo? Basta escrever: "mova a revisão para depois da prova". A IA reorganiza o plano na hora.',
    },
  ]

  const passos = [
    {
      num: '01',
      titulo: 'Crie sua conta e cadastre a disciplina',
      descricao: 'Configure o período letivo, os dias de aula e a metodologia. O Lexiona já carrega os feriados nacionais automaticamente.',
    },
    {
      num: '02',
      titulo: 'Envie o conteúdo programático',
      descricao: 'Texto livre, PDF da coordenação ou uma nota de voz. A IA lê tudo, extrai os temas e apresenta um resumo para você confirmar.',
    },
    {
      num: '03',
      titulo: 'Revise e consulte todos os dias',
      descricao: 'O plano completo aparece no calendário. A cada manhã, a Agenda do Dia mostra o que vem pela frente — sem precisar abrir o diário.',
    },
  ]

  const depoimentos = [
    {
      texto: 'Eu levava uma tarde inteira para montar o planejamento do semestre. Agora faço em 20 minutos. Não consigo imaginar voltar para as planilhas.',
      nome: 'Carla M.',
      cargo: 'Professora de Português · Ensino Médio',
      inicial: 'C',
      cor: 'bg-lexiona-600',
    },
    {
      texto: 'O Gerador de Ideias me salvou numa semana que eu estava sem criatividade nenhuma. Me deu quatro sugestões incríveis em segundos.',
      nome: 'Rafael T.',
      cargo: 'Professor de Física · Ensino Superior',
      inicial: 'R',
      cor: 'bg-amber-500',
    },
    {
      texto: 'Leciono em três turmas diferentes. Antes eu me perdia com os cadernos. Agora o Lexiona organiza tudo separado, sem misturar nada.',
      nome: 'Simone A.',
      cargo: 'Professora de Matemática · Fundamental e Médio',
      inicial: 'S',
      cor: 'bg-lexiona-800',
    },
  ]

  const inclusos = [
    'Plano de ensino gerado por IA',
    'Calendário interativo ilimitado',
    'Upload de PDF e DOCX',
    'Transcrição de nota de voz',
    'Gerador de Ideias para cada aula',
    'Agenda do dia atualizada',
    'Alertas de aulas pendentes',
    'Múltiplas disciplinas e turmas',
    'Feriados nacionais pré-carregados',
    'Chat para ajuste do plano',
  ]

  return (
    <div className="font-body bg-[#faf8f0] lp-root">

      {/* ================================================
          NAVBAR
      ================================================ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        navSolido ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-lexiona-100' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-lexiona-600 rounded-xl flex items-center justify-center shadow-sm">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className={`font-display font-bold text-xl transition-colors ${navSolido ? 'text-lexiona-900' : 'text-white'}`}>
              Lexiona
            </span>
          </div>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: 'Funcionalidades', href: '#funcionalidades' },
              { label: 'Como funciona', href: '#como-funciona' },
              { label: 'Depoimentos', href: '#depoimentos' },
            ].map(({ label, href }) => (
              <a key={href} href={href}
                className={`text-sm font-medium transition-colors hover:text-lexiona-400 ${navSolido ? 'text-lexiona-600' : 'text-lexiona-200'}`}>
                {label}
              </a>
            ))}
          </nav>

          {/* CTAs desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className={`text-sm font-medium transition-colors px-4 py-2 rounded-xl ${
                navSolido ? 'text-lexiona-700 hover:bg-lexiona-50' : 'text-lexiona-100 hover:text-white'
              }`}>
              Entrar
            </Link>
            <Link to="/cadastro"
              className="text-sm font-semibold bg-lexiona-500 hover:bg-lexiona-600 text-white px-5 py-2.5 rounded-xl transition shadow-sm">
              Criar conta grátis
            </Link>
          </div>

          {/* Menu mobile */}
          <button onClick={() => setMenuAberto(!menuAberto)} className="md:hidden p-2 rounded-xl">
            {menuAberto
              ? <X size={20} className={navSolido ? 'text-lexiona-900' : 'text-white'} />
              : <Menu size={20} className={navSolido ? 'text-lexiona-900' : 'text-white'} />}
          </button>
        </div>

        {/* Menu mobile aberto */}
        {menuAberto && (
          <div className="md:hidden bg-white border-t border-lexiona-100 px-6 py-4 space-y-3">
            {['#funcionalidades', '#como-funciona', '#depoimentos'].map((href) => (
              <a key={href} href={href} onClick={() => setMenuAberto(false)}
                className="block text-sm font-medium text-lexiona-700 py-2">
                {href.replace('#', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </a>
            ))}
            <div className="pt-2 space-y-2">
              <Link to="/login" className="block text-center py-2.5 border border-lexiona-200 rounded-xl text-sm font-medium text-lexiona-700">Entrar</Link>
              <Link to="/cadastro" className="block text-center py-2.5 bg-lexiona-600 rounded-xl text-sm font-semibold text-white">Criar conta grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* ================================================
          HERO
      ================================================ */}
      <section className="relative min-h-screen bg-[#0d2b1e] overflow-hidden flex items-center">
        {/* Textura de pontos */}
        <div className="absolute inset-0 lp-dot-texture opacity-30" />

        {/* Formas orgânicas de fundo */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-lexiona-700/20 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-lexiona-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-lexiona-900/30 blur-3xl" />

        {/* SVG decorativo — folha */}
        <svg className="absolute top-20 right-1/4 opacity-10 lp-rotate-slow" width="120" height="200" viewBox="0 0 120 200">
          <path d="M60 0 C60 0 120 60 120 120 C120 170 90 200 60 200 C30 200 0 170 0 120 C0 60 60 0 60 0Z" fill="#54b088"/>
          <line x1="60" y1="20" x2="60" y2="185" stroke="#2e9168" strokeWidth="2"/>
          <line x1="60" y1="80" x2="30" y2="110" stroke="#2e9168" strokeWidth="1.5"/>
          <line x1="60" y1="100" x2="90" y2="130" stroke="#2e9168" strokeWidth="1.5"/>
          <line x1="60" y1="130" x2="35" y2="155" stroke="#2e9168" strokeWidth="1.5"/>
        </svg>
        <svg className="absolute bottom-20 left-16 opacity-8 lp-rotate-slow-reverse" width="80" height="140" viewBox="0 0 80 140">
          <path d="M40 0 C40 0 80 40 80 80 C80 115 62 140 40 140 C18 140 0 115 0 80 C0 40 40 0 40 0Z" fill="#8accae"/>
          <line x1="40" y1="10" x2="40" y2="130" stroke="#54b088" strokeWidth="1.5"/>
        </svg>

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center">
          {/* Texto */}
          <div className="lp-reveal-left">
            <div className="inline-flex items-center gap-2 bg-lexiona-800/60 border border-lexiona-600/40 rounded-full px-4 py-1.5 mb-8">
              <Sparkles size={14} className="text-lexiona-400" />
              <span className="text-xs font-medium text-lexiona-300">Planejamento com Inteligência artificial para educadores</span>
            </div>

            <h1 className="font-display font-bold text-5xl lg:text-6xl text-white leading-[1.1] tracking-tight mb-6">
              O planejamento{' '}
              <span className="text-lexiona-400 italic">que você merecia</span>
              {' '}estar usando há anos.
            </h1>

            <p className="text-lexiona-300 text-lg leading-relaxed mb-10 max-w-md">
              O Lexiona usa inteligência artificial e diversas ferramentas práticas para transformar sua ementa em um plano de ensino completo, distribuído e organizado diretamente em um calendário letivo customizado para cada docente.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/cadastro"
                className="flex items-center justify-center gap-2 bg-lexiona-500 hover:bg-lexiona-400 text-white font-semibold px-7 py-4 rounded-2xl transition-all shadow-lg shadow-lexiona-900/50 text-base">
                Começar agora, grátis
                <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona"
                className="flex items-center justify-center gap-2 border border-lexiona-600/50 text-lexiona-300 hover:text-white hover:border-lexiona-400 font-medium px-7 py-4 rounded-2xl transition-all text-base">
                Ver como funciona
                <ChevronDown size={18} />
              </a>
            </div>

            <p className="text-lexiona-500 text-sm mt-6">
              ✓ Gratuito para sempre &nbsp;·&nbsp; ✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ Feito para professores
            </p>
          </div>

          {/* Mockup */}
          <div className="hidden lg:block lp-reveal-right">
            <HeroMockup />
          </div>
        </div>

        {/* Seta de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 lp-bounce">
          <ChevronDown size={24} className="text-lexiona-600" />
        </div>
      </section>

      {/* ================================================
          DORES
      ================================================ */}
      <section className="py-24 bg-[#faf8f0]" ref={refDores}>
        <div className={`max-w-5xl mx-auto px-6 transition-all duration-700 ${visibleDores ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-14">
            <p className="text-lexiona-500 text-sm font-medium uppercase tracking-widest mb-3">A realidade de quem educa</p>
            <h2 className="font-display font-bold text-4xl text-lexiona-900">
              Você se identifica com isso?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: '📋',
                titulo: 'Retrabalho a cada semestre',
                descricao: 'Copiar e adaptar planos antigos no Word, ajustar datas manualmente, rezar para o arquivo não sumir.',
              },
              {
                emoji: '🗓️',
                titulo: 'Calendário sempre no papel',
                descricao: 'Sem visão consolidada de quais aulas já estão prontas e quais ainda precisam de atenção.',
              },
              {
                emoji: '⚡',
                titulo: 'Amanhã tem aula — e agora?',
                descricao: 'Só lembrando da aula na noite anterior, sem tempo para preparar algo mais elaborado.',
              },
            ].map((dor, i) => (
              <div key={i}
                className="bg-white border border-lexiona-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="text-4xl mb-4">{dor.emoji}</div>
                <h3 className="font-display font-semibold text-lexiona-900 text-lg mb-2">{dor.titulo}</h3>
                <p className="text-lexiona-600 text-sm leading-relaxed">{dor.descricao}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="inline-block bg-lexiona-600 text-white font-semibold text-lg px-8 py-3 rounded-2xl font-display">
              O Lexiona resolve tudo isso. ↓
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          FUNCIONALIDADES
      ================================================ */}
      <section id="funcionalidades" className="py-24 bg-white" ref={refFeatures}>
        <div className={`max-w-6xl mx-auto px-6 transition-all duration-700 ${visibleFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16">
            <p className="text-lexiona-500 text-sm font-medium uppercase tracking-widest mb-3">Tudo que você precisa</p>
            <h2 className="font-display font-bold text-4xl text-lexiona-900">
              Planejamento inteligente,<br />do início ao fim do semestre
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i}
                className="group flex gap-5 p-6 bg-[#faf8f0] hover:bg-lexiona-50 border border-transparent hover:border-lexiona-200 rounded-2xl transition-all duration-300"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-12 h-12 bg-white border border-lexiona-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lexiona-900 mb-1.5">{f.titulo}</h3>
                  <p className="text-lexiona-600 text-sm leading-relaxed">{f.descricao}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Entrada híbrida */}
          <div className="mt-8 bg-[#faf8f0] border border-lexiona-100 rounded-2xl p-8">
            <p className="text-lexiona-500 text-xs font-medium uppercase tracking-widest mb-4">3 formas de inserir seu conteúdo</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: <FileText size={20} className="text-lexiona-600" />, titulo: 'Texto livre', desc: 'Cole qualquer texto ou anotação do seu caderno.' },
                { icon: <Upload size={20} className="text-lexiona-600" />, titulo: 'Upload de arquivo', desc: 'Envie a ementa em PDF ou DOCX da coordenação.' },
                { icon: <Mic size={20} className="text-lexiona-600" />, titulo: 'Nota de voz', desc: 'Fale sobre a disciplina. A IA transcreve e estrutura.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-lexiona-100">
                  <div className="w-9 h-9 bg-lexiona-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-lexiona-900 text-sm">{item.titulo}</p>
                    <p className="text-lexiona-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          RF23 SPOTLIGHT — GERADOR DE IDEIAS
      ================================================ */}
      <section className="py-24 bg-[#0d2b1e] overflow-hidden relative" ref={refRF23}>
        <div className="absolute inset-0 lp-dot-texture opacity-20" />
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-lexiona-600/20 blur-3xl" />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-lexiona-500/15 blur-3xl" />

        <div className={`relative max-w-4xl mx-auto px-6 text-center transition-all duration-700 ${visibleRF23 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-1.5 mb-8">
            <Lightbulb size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-300">Funcionalidade exclusiva</span>
          </div>

          <h2 className="font-display font-bold text-4xl lg:text-5xl text-white mb-6 leading-tight">
            Sem inspiração para a aula<br />de quinta-feira?
          </h2>

          <p className="text-lexiona-300 text-lg leading-relaxed mb-12 max-w-2xl mx-auto">
            Clique em qualquer data no calendário e peça ao <strong className="text-lexiona-200">Gerador de Ideias</strong>. A IA analisa o que foi ensinado antes, o que vem depois, e a metodologia da disciplina — e sugere 4 ideias contextuais, prontas para aplicar com um clique.
          </p>

          {/* Cards de ideias mockup */}
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-12">
            {[
              { titulo: 'Debate em duplas com problema real', tag: 'ABP' },
              { titulo: 'Quiz de revisão com pontuação', tag: 'Gamificação' },
              { titulo: 'Análise de estudo de caso do mercado', tag: 'Hibrido' },
              { titulo: 'Mapa mental colaborativo no quadro', tag: 'Visual' },
            ].map((ideia, i) => (
              <div key={i}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 text-left hover:bg-white/15 transition cursor-default">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm font-medium leading-snug">{ideia.titulo}</p>
                  <span className="text-xs bg-lexiona-500/30 text-lexiona-300 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">{ideia.tag}</span>
                </div>
                <p className="text-lexiona-400 text-xs mt-2">Clique para aplicar →</p>
              </div>
            ))}
          </div>

          <Link to="/cadastro"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-8 py-4 rounded-2xl transition shadow-lg text-base">
            <Lightbulb size={18} />
            Experimentar o Gerador de Ideias
          </Link>
        </div>
      </section>

      {/* ================================================
          COMO FUNCIONA
      ================================================ */}
      <section id="como-funciona" className="py-24 bg-white" ref={refComo}>
        <div className={`max-w-5xl mx-auto px-6 transition-all duration-700 ${visibleComo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16">
            <p className="text-lexiona-500 text-sm font-medium uppercase tracking-widest mb-3">Simples assim</p>
            <h2 className="font-display font-bold text-4xl text-lexiona-900">Como funciona</h2>
          </div>

          <div className="space-y-8">
            {passos.map((p, i) => (
              <div key={i}
                className="group flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center bg-[#faf8f0] hover:bg-lexiona-50 border border-transparent hover:border-lexiona-200 rounded-2xl p-8 transition-all"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex-shrink-0">
                  <span className="font-display font-bold text-7xl text-lexiona-100 group-hover:text-lexiona-200 transition leading-none select-none">
                    {p.num}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-xl text-lexiona-900 mb-2">{p.titulo}</h3>
                  <p className="text-lexiona-600 leading-relaxed">{p.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
          DEPOIMENTOS
      ================================================ */}
      <section id="depoimentos" className="py-24 bg-[#faf8f0]" ref={refDepo}>
        <div className={`max-w-6xl mx-auto px-6 transition-all duration-700 ${visibleDepo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-14">
            <p className="text-lexiona-500 text-sm font-medium uppercase tracking-widest mb-3">Quem já usa</p>
            <h2 className="font-display font-bold text-4xl text-lexiona-900">
              O que os professores dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {depoimentos.map((d, i) => (
              <div key={i}
                className="relative bg-white rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow border border-lexiona-100"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Aspas decorativas */}
                <div className="font-display text-7xl text-lexiona-100 leading-none select-none absolute top-4 right-6">"</div>

                {/* Estrelas */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="text-amber-400 fill-amber-400" />)}
                </div>

                <p className="text-lexiona-700 leading-relaxed text-sm mb-6 relative z-10">
                  "{d.texto}"
                </p>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${d.cor} rounded-xl flex items-center justify-center text-white font-bold font-display`}>
                    {d.inicial}
                  </div>
                  <div>
                    <p className="font-semibold text-lexiona-900 text-sm">{d.nome}</p>
                    <p className="text-lexiona-500 text-xs">{d.cargo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================
          GRATUITO
      ================================================ */}
      <section className="py-24 bg-white" ref={refGratis}>
        <div className={`max-w-4xl mx-auto px-6 transition-all duration-700 ${visibleGratis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-[#0d2b1e] rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-lexiona-700/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-lexiona-600/15 rounded-full blur-3xl" />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-lexiona-500/20 border border-lexiona-500/30 rounded-full px-4 py-1.5 mb-6">
                  <Check size={14} className="text-lexiona-400" />
                  <span className="text-xs font-medium text-lexiona-300">Sem planos pagos, sem pegadinhas</span>
                </div>
                <h2 className="font-display font-bold text-4xl text-white mb-4">
                  100% gratuito.<br />Para sempre.
                </h2>
                <p className="text-lexiona-300 leading-relaxed mb-8">
                  O Lexiona é construído sobre ferramentas com planos gratuitos generosos. Você não vai pagar nada para planejar melhor suas aulas.
                </p>
                <Link to="/cadastro"
                  className="inline-flex items-center gap-2 bg-lexiona-500 hover:bg-lexiona-400 text-white font-semibold px-7 py-4 rounded-2xl transition shadow-lg text-base">
                  Criar minha conta grátis
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {inclusos.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                    <Check size={15} className="text-lexiona-400 flex-shrink-0" />
                    <span className="text-lexiona-200 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================
          CTA FINAL
      ================================================ */}
      <section className="py-24 bg-[#faf8f0]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-lexiona-500 text-sm font-medium uppercase tracking-widest mb-4">Pronto para começar?</p>
          <h2 className="font-display font-bold text-4xl lg:text-5xl text-lexiona-900 mb-6 leading-tight">
            Seu próximo semestre<br />começa aqui.
          </h2>
          <p className="text-lexiona-600 text-lg mb-10 leading-relaxed">
            Cadastre-se em 2 minutos, configure sua primeira disciplina e veja o plano completo aparecer no calendário. Sem tutoriais longos, sem curva de aprendizado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/cadastro"
              className="flex items-center justify-center gap-2 bg-lexiona-600 hover:bg-lexiona-700 text-white font-semibold px-9 py-4 rounded-2xl transition shadow-md text-base">
              Criar conta gratuita
              <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border-2 border-lexiona-200 text-lexiona-700 hover:border-lexiona-400 hover:bg-white font-medium px-9 py-4 rounded-2xl transition text-base">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================
          FOOTER
      ================================================ */}
      <footer className="bg-[#0d2b1e] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-lexiona-600 rounded-lg flex items-center justify-center">
                <BookOpen size={13} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">Lexiona</span>
            </div>
            <p className="text-lexiona-600 text-sm text-center">
              Planejamento pedagógico inteligente para docentes brasileiros.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/login" className="text-lexiona-500 hover:text-lexiona-300 text-sm transition">Entrar</Link>
              <Link to="/cadastro" className="text-lexiona-500 hover:text-lexiona-300 text-sm transition">Cadastrar</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-lexiona-800/50 text-center">
            <p className="text-lexiona-700 text-xs">
              © 2026 Lexiona · Feito com 💚 para educadores
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}