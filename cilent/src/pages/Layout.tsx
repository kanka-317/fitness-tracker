import { Outlet } from "react-router-dom"
import Sidebar from "../components/ui/Sidebar"

const Layout = () => {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content-shell">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
