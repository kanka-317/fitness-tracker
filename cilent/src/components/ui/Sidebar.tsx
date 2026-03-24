import {
  Activity,
  Home,
  Moon,
  Salad,
  Sparkles,
  SunMedium,
  UserRound,
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useTheme } from "../../context/ThemeContext"

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/food", label: "Food", icon: Salad },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: UserRound },
]

const Sidebar = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="sidebar-panel">
      <div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <Sparkles size={16} />
          </span>
          <span>FitTrack</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="sidebar-theme-toggle"
      >
        {theme === "light" ? <Moon size={18} /> : <SunMedium size={18} />}
        <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
      </button>
    </aside>
  )
}

export default Sidebar
