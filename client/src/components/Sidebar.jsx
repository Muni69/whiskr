import {
  LayoutDashboard,
  Package,
  Tags,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "attributes", label: "Attributes", icon: SlidersHorizontal },
  { id: "quality", label: "Data Quality", icon: ShieldCheck },
  { id: "ai", label: "Whiskr AI", icon: Sparkles },
  { id: "sync", label: "Synchronization", icon: RefreshCw },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  showSync = false,
}) {
  // Synchronization is only offered when the backend reports a real connection.
  const items = showSync
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== "sync");

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden="true">
          <img src={logo} alt="" />
        </div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <strong>Whiskr</strong>
          </div>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`sidebar__item ${
              activePage === id ? "sidebar__item--active" : ""
            }`}
            onClick={() => onNavigate(id)}
            title={collapsed ? label : undefined}
            aria-current={activePage === id ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={1.9} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar__collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

