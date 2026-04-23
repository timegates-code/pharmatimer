// ============================================================
// ProfiliTab — placeholder (CP2 Sessione 8a / §6.78).
// ============================================================
//
// Functional implementation in Sessione 8b. The `data-testid`
// wrapper is STABLE across 8a-8b: when the real component lands,
// `data-testid="config-tab-profili"` must remain on the top-level
// container so that ConfigView routing tests keep passing without
// touching them.

export default function ProfiliTab() {
  return (
    <section data-testid="config-tab-profili" className="p-4">
      <h2 className="text-xl font-semibold">Profili</h2>
      <p className="text-sm opacity-70 mt-2">
        Non ancora implementato (pianificato: Sessione 8b).
      </p>
    </section>
  );
}
