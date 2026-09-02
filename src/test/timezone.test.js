// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Pin del fuso della suite. Sede del pin: vitest.config.js, che imposta
// process.env.TZ prima di defineConfig.
//
// Perche esiste questo file: un pin che nessuno verifica non e un pin. Se
// qualcuno toglie la riga da vitest.config.js, o la cambia, questi tre test
// arrossano NOMINANDO il fuso trovato, invece di lasciare che la suite
// ricominci silenziosamente a misurare la macchina su cui gira.
//
// I due offset non sono decorazione: sono il controllo che il fuso pinnato
// ABBIA davvero lora legale. Un fuso senza DST passerebbe il primo test se
// lo si scrivesse solo sul nome, e non il secondo e il terzo.
describe('fuso della suite', () => {
  it('e pinnato a Europe/Rome', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Rome');
  });

  it('in gennaio e ora solare: UTC+1, offset -60', () => {
    expect(new Date('2026-01-15T12:00:00').getTimezoneOffset()).toBe(-60);
  });

  it('in luglio e ora legale: UTC+2, offset -120', () => {
    expect(new Date('2026-07-15T12:00:00').getTimezoneOffset()).toBe(-120);
  });
});
