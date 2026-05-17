import { NavLink } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h6v7H4zM14 4h6v16h-6zM4 4h6v5H4z" />
      </svg>
    ),
  },
  {
    to: "/upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 7 8h3v6h4V8h3z" />
        <path d="M5 17h14v3H5z" />
      </svg>
    ),
  },
  {
    to: "/history",
    label: "History",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a8 8 0 1 1-7.45 5.08l-1.8-.72A10 10 0 1 0 6.1 4.6L4 2.5V8h5.5L7.52 6.02A7.96 7.96 0 0 1 12 4z" />
        <path d="M11 7h2v5l4 2-.9 1.79L11 13z" />
      </svg>
    ),
  },
];

function Sidebar() {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 flex flex-col">
      <div className="sidebar-brand flex items-center gap-3 px-5 py-6">
        <span className="sidebar-logo-mark" aria-hidden="true" />
        <span className="sidebar-logo-text">OptiScan</span>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3${
                isActive ? " sidebar-nav-link-active" : ""
              }`
            }
            title={item.label}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-5 py-5">
        <p className="sidebar-version">v1.0 - AI-Powered</p>
      </div>
    </aside>
  );
}

export default Sidebar;
