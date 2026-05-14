import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, LayoutDashboard, Calendar, LogOut } from 'lucide-react'

export default function Navbar() {
  const { professor, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const links = [
    { to: '/app',             label: 'Agenda',      icon: LayoutDashboard, exact: true },
    { to: '/app/calendario',  label: 'Calendário',  icon: Calendar },
    { to: '/app/disciplinas', label: 'Disciplinas', icon: BookOpen },
  ]

  return (
    <header className="bg-white border-b border-lexiona-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/app" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-lexiona-600 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-lexiona-900 text-lg">Lexiona</span>
          </NavLink>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-lexiona-50 text-lexiona-700'
                      : 'text-lexiona-500 hover:text-lexiona-700 hover:bg-lexiona-50'
                  }`
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Perfil e sair */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-lexiona-600 hidden sm:block truncate max-w-32">
              {professor?.nome?.split(' ')[0]}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-lexiona-400 hover:text-lexiona-700 hover:bg-lexiona-50 rounded-lg transition"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}