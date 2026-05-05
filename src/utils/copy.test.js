import { describe, it, expect } from 'vitest';
import { formatRelazionePastoCopy, formatPrimaDose } from './copy';

// 13 test = 6 enum × {detail, null} + 1 defensive enum sconosciuto.
// Drift §6.124: body stripped del prefisso "Assumere " vs DoseCard.getPastoText.

describe('formatRelazionePastoCopy', () => {
  describe('passthrough dettaglio_pasto truthy (5 enum non-indifferente)', () => {
    it('prima + dettaglio → passthrough nudo (no "Assumere ")', () => {
      const f = { relazione_pasto: 'prima', dettaglio_pasto: '30 min prima colazione' };
      expect(formatRelazionePastoCopy(f)).toBe('30 min prima colazione');
    });

    it('durante + dettaglio → passthrough', () => {
      const f = { relazione_pasto: 'durante', dettaglio_pasto: 'durante colazione' };
      expect(formatRelazionePastoCopy(f)).toBe('durante colazione');
    });

    it('dopo + dettaglio → passthrough', () => {
      const f = { relazione_pasto: 'dopo', dettaglio_pasto: 'durante/dopo cena' };
      expect(formatRelazionePastoCopy(f)).toBe('durante/dopo cena');
    });

    it('stomaco_pieno + dettaglio → passthrough', () => {
      const f = { relazione_pasto: 'stomaco_pieno', dettaglio_pasto: 'a stomaco pieno' };
      expect(formatRelazionePastoCopy(f)).toBe('a stomaco pieno');
    });

    it('lontano + dettaglio → passthrough', () => {
      const f = { relazione_pasto: 'lontano', dettaglio_pasto: 'lontano dai pasti' };
      expect(formatRelazionePastoCopy(f)).toBe('lontano dai pasti');
    });
  });

  describe('indifferente → null sempre (Q-CP1.1=A: early-return ignora detail)', () => {
    it('indifferente + detail → null (detail ignorato per coerenza con getPastoText)', () => {
      const f = { relazione_pasto: 'indifferente', dettaglio_pasto: 'qualcosa' };
      expect(formatRelazionePastoCopy(f)).toBeNull();
    });

    it('indifferente + null → null (caller fallback "Promemoria farmaco")', () => {
      const f = { relazione_pasto: 'indifferente', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBeNull();
    });
  });

  describe('fallback mapping stripped quando dettaglio_pasto null (5 enum)', () => {
    it('prima + null → "prima dei pasti"', () => {
      const f = { relazione_pasto: 'prima', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBe('prima dei pasti');
    });

    it('durante + null → "durante i pasti"', () => {
      const f = { relazione_pasto: 'durante', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBe('durante i pasti');
    });

    it('dopo + null → "dopo i pasti"', () => {
      const f = { relazione_pasto: 'dopo', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBe('dopo i pasti');
    });

    it('stomaco_pieno + null → "a stomaco pieno"', () => {
      const f = { relazione_pasto: 'stomaco_pieno', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBe('a stomaco pieno');
    });

    it('lontano + null → "lontano dai pasti"', () => {
      const f = { relazione_pasto: 'lontano', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBe('lontano dai pasti');
    });
  });

  describe('defensive (Q-CP1.2=C)', () => {
    it('relazione_pasto sconosciuto → null', () => {
      const f = { relazione_pasto: 'sconosciuto', dettaglio_pasto: null };
      expect(formatRelazionePastoCopy(f)).toBeNull();
    });
  });
});

// =============================================================
// CP5 v3.0.0 Step 1 — formatPrimaDose (§22.41 Q-UX.5 override punto 8).
// =============================================================
//
// 4 test = today / tomorrow / future-same-year / future-cross-year.

describe('formatPrimaDose (CP5 v3.0.0 Step 1, Q-UX.5)', () => {
  it('today: "oggi, [giorno] [num] [mese], alle [HH:MM]"', () => {
    // Riferimento: lunedì 4 maggio 2026.
    const out = formatPrimaDose('2026-05-04', '13:00', '2026-05-04');
    expect(out).toBe('oggi, lunedì 4 maggio, alle 13:00');
  });

  it('tomorrow: "domani, [giorno] [num] [mese], alle [HH:MM]"', () => {
    const out = formatPrimaDose('2026-05-05', '07:30', '2026-05-04');
    expect(out).toBe('domani, martedì 5 maggio, alle 07:30');
  });

  it('future same year: "[giorno] [num] [mese] alle [HH:MM]" (no "alle," — override punto 8)', () => {
    // 2026-05-12 = martedì 12 maggio.
    const out = formatPrimaDose('2026-05-12', '07:30', '2026-05-04');
    expect(out).toBe('martedì 12 maggio alle 07:30');
  });

  it('future cross year: include anno suffix', () => {
    // today 2026-12-30, prima dose 2027-01-05 (martedì).
    const out = formatPrimaDose('2027-01-05', '07:30', '2026-12-30');
    expect(out).toBe('martedì 5 gennaio 2027 alle 07:30');
  });
});
