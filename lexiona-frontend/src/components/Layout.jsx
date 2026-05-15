import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, BookOpen, BarChart3, Settings, LogOut, Leaf } from 'lucide-react'
import PwaInstallPrompt from './PwaInstallPrompt'

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/app/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/app/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { to: '/app/relatorios', label: 'Relatórios', icon: BarChart3 },
]

export default function Layout() {
  const navigate = useNavigate()
  const professor = JSON.parse(localStorage.getItem('lexiona_professor') || '{}')

  function handleLogout() {
    localStorage.removeItem('lexiona_token')
    localStorage.removeItem('lexiona_professor')
    navigate('/login')
  }

  const initials = professor.nome
    ? professor.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'P'

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── TOP NAV ───────────────────────────────────────── */}
      <header className="bg-white border-b border-lexiona-100 sticky top-0 z-30 shadow-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <NavLink to="/app" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-lexiona-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-lexiona-700 transition">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lexiona-900 text-lg tracking-tight">
              Lexiona
            </span>
          </NavLink>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-lexiona-600 text-white shadow-sm'
                      : 'text-lexiona-600 hover:bg-lexiona-50 hover:text-lexiona-800'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Avatar + settings + logout */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/app/configuracoes"
              className={({ isActive }) =>
                `p-2 rounded-lg transition ${isActive ? 'bg-lexiona-50 text-lexiona-700' : 'text-lexiona-400 hover:text-lexiona-600 hover:bg-lexiona-50'}`
              }
              title="Configurações"
            >
              <Settings size={18} />
            </NavLink>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-lexiona-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Sair"
            >
              <LogOut size={18} />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lexiona-500 to-lexiona-700 flex items-center justify-center text-white text-xs font-bold ml-1 shadow-sm">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO ──────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <Outlet />
      </main>

      {/* ── MOBILE NAV ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-lexiona-100 z-30 shadow-[0_-2px_12px_rgba(15,48,35,0.06)]">
        <div className="flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all ${
                  isActive
                    ? 'text-lexiona-600'
                    : 'text-lexiona-400 hover:text-lexiona-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition ${isActive ? 'bg-lexiona-50' : ''}`}>
                    <Icon size={18} />
                  </div>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Espaço para nav mobile */}
      <div className="md:hidden h-16" />

      {/* PWA install prompt */}
      <PwaInstallPrompt />
    </div>
  )
}
