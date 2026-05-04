// ============================================================
// EmptyStateZeroFarmaci unit test — Q-UX.3 (CP3 v3.0.0 Step 1).
// ============================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmptyStateZeroFarmaci from "./EmptyStateZeroFarmaci.jsx";

vi.mock("../../hooks/useTheme.js", () => ({
  useTheme: () => ({
    tokens: {
      textPrimary: "#000",
      textSecondary: "#666",
    },
  }),
}));

describe("EmptyStateZeroFarmaci (Q-UX.3)", () => {
  it("renders title, sub and CTA link to /config/farmaci", () => {
    render(
      <MemoryRouter>
        <EmptyStateZeroFarmaci />
      </MemoryRouter>
    );

    // Title + subline (copy par.22.41)
    expect(
      screen.getByText("Nessun farmaco configurato")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aggiungi il tuo primo farmaco per iniziare/i)
    ).toBeInTheDocument();

    // CTA link points to /config/farmaci (par.6.169)
    const cta = screen.getByTestId("empty-state-cta");
    expect(cta).toHaveAttribute("href", "/config/farmaci");
    expect(cta).toHaveTextContent("+ Aggiungi il tuo primo farmaco");
  });
});
