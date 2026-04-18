import { NavLink, useLocation } from "react-router-dom";

// Bottom tab bar. Tabs: Oggi, Log, Export, Config.
// Full styling arrives in Step 7 together with the theme system.
export default function NavBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/oggi", label: "Oggi" },
    { to: "/log", label: "Log" },
    { to: "/export", label: "Export" },
    { to: "/config", label: "Config" }
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around py-2 pb-6 max-w-md mx-auto">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.to);
          return (
            <NavLink key={t.to} to={t.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
              style={{ color: active ? "#2563EB" : "#A8A29E" }}>
              <span className="text-xs font-medium">{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
