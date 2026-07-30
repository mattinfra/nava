import { Icon } from "./Icon.js";

export type AppPanel = "home" | "live" | "map" | "game";

interface AppTabbarProps {
  active: AppPanel;
  onChange: (panel: AppPanel) => void;
}

const TABS: Array<{ panel: AppPanel; icon: string; label: string }> = [
  { panel: "home", icon: "tab-home", label: "Home" },
  { panel: "live", icon: "tab-live", label: "Live" },
  { panel: "map", icon: "tab-map", label: "Mappa" },
  { panel: "game", icon: "tab-game", label: "Gioco" },
];

export function AppTabbar({ active, onChange }: AppTabbarProps) {
  return (
    <nav className="app-tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.panel}
          className={`app-tab${active === tab.panel ? " active" : ""}`}
          type="button"
          onClick={() => onChange(tab.panel)}
        >
          <Icon name={tab.icon} className="tab-icon" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
