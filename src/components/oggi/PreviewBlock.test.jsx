// ============================================================
// PreviewBlock unit test — Q-UX.4 (CP3 v3.0.0 Step 1).
// ============================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PreviewBlock from "./PreviewBlock.jsx";

vi.mock("../../hooks/useTheme.js", () => ({
  useTheme: () => ({
    tokens: {
      textPrimary: "#000",
      textSecondary: "#666",
      dateSepBgStrong: "#eee",
      dateSepTx: "#000",
      borderSubtle: "#ccc",
    },
  }),
}));

vi.mock("../../state/AppContext.jsx", () => ({
  useAppContext: () => ({
    state: {
      farmaci: [
        { id: 1, nome: "Pantorc", attivo: 1 },
        { id: 2, nome: "Cardioaspirina", attivo: 1 },
      ],
    },
  }),
}));

describe("PreviewBlock (Q-UX.4)", () => {
  it("renders header + groups + cards from proxData", () => {
    const proxData = {
      dateStr: "2026-05-15",
      dateLabel: "DOMANI · MARTEDI 5 MAGGIO",
      groups: [
        {
          primaOra: "08:00",
          descrizioneMomento: "colazione",
          entries: [
            {
              key: "e1",
              dateStr: "2026-05-15",
              ora_prevista: "08:00",
              farmaco_id: 1,
            },
          ],
        },
        {
          primaOra: "13:00",
          descrizioneMomento: "pranzo",
          entries: [
            {
              key: "e2",
              dateStr: "2026-05-15",
              ora_prevista: "13:00",
              farmaco_id: 2,
            },
          ],
        },
      ],
    };

    render(<PreviewBlock proxData={proxData} />);

    // Header sezione (Q-UX.4)
    expect(screen.getByTestId("preview-block")).toBeInTheDocument();
    expect(
      screen.getByText(/PROSSIMA TERAPIA · DOMANI · MARTEDI 5 MAGGIO/i)
    ).toBeInTheDocument();

    // Momento headers
    expect(screen.getByText(/ORE 08:00 — COLAZIONE/i)).toBeInTheDocument();
    expect(screen.getByText(/ORE 13:00 — PRANZO/i)).toBeInTheDocument();

    // Cards renderate con nome farmaco lookup-ed
    expect(screen.getByTestId("preview-card-e1")).toBeInTheDocument();
    expect(screen.getByTestId("preview-card-e2")).toBeInTheDocument();
    expect(screen.getByText("Pantorc")).toBeInTheDocument();
    expect(screen.getByText("Cardioaspirina")).toBeInTheDocument();
  });
});
