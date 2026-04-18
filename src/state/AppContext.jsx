import { createContext, useContext } from "react";

// Step 5 — Global state context. Stub for scaffold.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  return <AppContext.Provider value={{}}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
