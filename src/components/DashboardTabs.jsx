import { LayoutDashboard, ClipboardList, Camera, Users, Settings } from "lucide-react";

const DASHBOARD_TABS = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "evidence", label: "Evidencias", icon: Camera },
  { id: "people", label: "Personas", icon: Users },
  { id: "settings", label: "Ajustes", icon: Settings },
];

export default function DashboardTabs({ active, onChange }) {
  function handleKeyDown(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + DASHBOARD_TABS.length) % DASHBOARD_TABS.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DASHBOARD_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = DASHBOARD_TABS.length - 1;
    const next = DASHBOARD_TABS[nextIndex];
    onChange(next.id);
    document.getElementById(`dashboard-tab-${next.id}`)?.focus();
  }

  return (
    <nav className="sm-dashboard-tabs" role="tablist" aria-label="Secciones del dashboard">
      {DASHBOARD_TABS.map((tab, index) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`dashboard-tab-${tab.id}`}
            className={`sm-dashboard-tab${selected ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`dashboard-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon size={17} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
