// @vitest-environment node
// ============================================================
// IndicatoreCoda -- test di completezza dei montaggi (CS-5.5-sexies, P-3).
// Forma ratificata da Q-ROSONE-6=A.
// SENTINEL_QMETOPA_COMPLETEZZA
// ------------------------------------------------------------
// PERCHE `node` E NON `jsdom`: questo non misura cosa la app RENDE, ma dove
// lo indicatore e MONTATO. Montare tre viste per contarne i nodi costerebbe
// tre provider e non proverebbe di piu.
//
// LC-89 IN PREVENZIONE: il predicato e `<IndicatoreCoda` col MINORE, mai il
// token nudo. Tutte e tre le sedi lo IMPORTANO senza che lo import sia un
// montaggio, e un conteggio sul token confonderebbe importare con montare.
//
// LA SOLA RIGA DIVERGENTE e ConfigView -> ConfigTabBar: la fascia delle
// linguette e la intestazione fissa di quel sottoalbero (Q-ROSONE-4=A),
// quindi lo indicatore vive li e non nel file omonimo alla vista.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leggi = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

// vista -> sede. TRE righe, una per rotta non-Navigate di App.jsx.
const TABELLA = [
  { vista: 'OggiView', sede: 'src/components/oggi/OggiView.jsx' },
  { vista: 'ConfigView', sede: 'src/components/config/ConfigTabBar.jsx' },
  { vista: 'CronologiaView', sede: 'src/components/cronologia/CronologiaView.jsx' },
];

// Estrae i nomi di componente da `element={<Nome`, dentro il SOLO blocco
// <Routes>. Fuori di li `element={<` non compare, ma restringere il
// perimetro rende la sonda leggibile invece che fortunata (LC-105).
function elementiDiRotta() {
  const app = leggi('src/App.jsx');
  const inizio = app.indexOf('<Routes>');
  const fine = app.indexOf('</Routes>');
  if (inizio < 0 || fine < 0) throw new Error('blocco <Routes> non trovato in App.jsx');
  const blocco = app.slice(inizio, fine);
  return [...blocco.matchAll(/element=\{<([A-Za-z0-9_]+)/g)].map((m) => m[1]);
}

describe('IndicatoreCoda -- completezza dei montaggi (Q-ROSONE-6=A)', () => {
  it('la tabella vista -> sede copre ESATTAMENTE le rotte non-Navigate di App.jsx', () => {
    const viste = [...new Set(elementiDiRotta().filter((n) => n !== 'Navigate'))];
    const tabellate = TABELLA.map((r) => r.vista);
    expect(tabellate.slice().sort()).toEqual(viste.slice().sort());
  });

  it('CONTROLLO POSITIVO: lo estrattore VEDE i Navigate, quindi escluderli non e vacuo', () => {
    const grezzi = elementiDiRotta();
    expect(grezzi.filter((n) => n === 'Navigate').length).toBeGreaterThan(0);
    expect(grezzi.length).toBeGreaterThan(TABELLA.length);
  });

  for (const { vista, sede } of TABELLA) {
    it(`${vista}: la sede ${sede} monta <IndicatoreCoda esattamente una volta`, () => {
      const montaggi = leggi(sede).match(/<IndicatoreCoda/g) ?? [];
      expect(montaggi).toHaveLength(1);
    });
  }

  it('ConfigView e la SOLA riga in cui la sede diverge dal file omonimo alla vista', () => {
    const divergenti = TABELLA.filter((r) => !r.sede.endsWith(`/${r.vista}.jsx`));
    expect(divergenti.map((r) => r.vista)).toEqual(['ConfigView']);
  });
});
