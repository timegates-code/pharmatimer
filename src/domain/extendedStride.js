/**
 * @fileoverview P15-A -- canone unico della cadenza "extended" (stride).
 *
 * Unica sede che sappia QUANDO e dovuta la dose di un farmaco a intervallo
 * esteso (intervallo_ore > 24). I due chiamanti -- il generatore del piano
 * (extendedFrequency.js) e il toast R4 (startBoundary.js) -- delegano qui e
 * NON calcolano piu cadenza in proprio: due implementazioni della stessa
 * regola sono una divergenza in attesa di accadere (Q-P15-7=(A),
 * par.22.198-quaterdecies). Il contratto di mirroring che startBoundary.js
 * dichiarava in un commento e ora la STESSA FUNZIONE.
 *
 * BIFORCAZIONE (Q-P15-2=(A)) -- vive per intero in occurrenceDateAt():
 *
 *   intervallo_ore multiplo di 24  ->  GIORNI CIVILI a orario fisso.
 *     "ogni 2 giorni alle 08:00" = la dose delle 08:00 ogni secondo giorno
 *     di CALENDARIO, quali che siano le ore reali trascorse (47 o 49
 *     attraverso una transizione DST). E la regola di dominio ratificata
 *     Q1=(a): le cadenze multiple di 24 ore sono cadenze a giorni civili
 *     a orario fisso.
 *
 *   altrimenti                     ->  stride in millisecondi, PRESERVATO.
 *     I non-multipli di 24 conservano l aritmetica storica. Questo ramo non
 *     e riparato, solo trasferito: MOD-1/(R) (colonna intervallo_giorni
 *     separata) lo estingue alla radice. Popolazione prod: ZERO.
 *
 * PERCHE la biforcazione esiste -- MISURATO (M2-M5 par.22.198-quindecies,
 * riconfermato par.22.198-quindecies-bis; TZ=Europe/Rome, DST IT 2026:
 * 29 mar / 25 ott). Lo stride ms non sbaglia di "+/-1h estetico": sbaglia di
 * +/-1 GIORNO sulla DATA della dose.
 *
 *   ancora 2026-10-24 00:30,  48h -> k=1: ms 10-25, civile 10-26  (-1 giorno)
 *   ancora 2026-03-28 23:30,  48h -> k=1: ms 03-31, civile 03-30  (+1 giorno)
 *   ancora 2026-10-20 00:30, 168h -> k=1: ms 10-26, civile 10-27  (-1 giorno)
 *
 * Il drift ORARIO invece non raggiunge mai la UI (ora_prevista e costante per
 * convenzione): il danno era tutto sulla data. La glossa che assolveva lo
 * stride ms citando il verdetto §22.42 "addMinutesToIso aritmeticamente
 * corretto" era una MISATTRIBUZIONE: quel verdetto riguarda una funzione a
 * semantica CIVILE (misurato M1, par.22.198-quindecies).
 *
 * Pure module: no Date.now(), no DB, no globals.
 * SENTINEL_P15A_EXTENDEDSTRIDE
 */

import { addDays } from '../utils/time.js';

const MS_PER_HOUR = 3600 * 1000;

/**
 * Bound duro della ricerca di k. Un passo vale >= 24h per contratto (i
 * chiamanti gateano su intervallo_ore > 24): 2^20 passi coprono ~2900 anni,
 * nessun confine reale li raggiunge. Esiste solo perche un chiamante che
 * violasse il contratto (ore <= 0) non possa far girare il ciclo per sempre.
 */
const K_SEARCH_MAX = 1 << 20;

/** 'YYYY-MM-DD' from a Date, local components. */
function isoDateLocal(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * La cadenza e un numero intero di giorni civili?
 *
 * `% 24 === 0` e SICURO sul dominio DECIMAL(4,1) di intervallo_ore, per
 * MISURA (M6 par.22.198-quindecies): 24/48/168/984 -> true; 26.4 -> resto
 * 2.3999999999999986, 999.9 -> 15.899999999999977, 30/36 -> false. Nessuna
 * trappola float nel dominio raggiungibile.
 *
 * ESPORTATA perche P15-B la RIUSA per la quarantena Q-P15-6 (rappresentabile
 * <=> ore % 24 === 0 e giorni in 2..41). Riscriverla li sarebbe LC-64.
 *
 * @param {unknown} ore
 * @returns {boolean}
 */
export function isCivilDayStride(ore) {
  return typeof ore === 'number' && ore > 0 && ore % 24 === 0;
}

/**
 * Data della k-esima occorrenza. UNICA sede della biforcazione.
 *
 * @param {string} dataInizio 'YYYY-MM-DD' -- ancora
 * @param {string} oraPrevista 'HH:MM' -- orario dell ancora, COSTANTE su ogni k
 * @param {number} ore intervallo_ore
 * @param {number} k intero >= 0
 * @returns {string} 'YYYY-MM-DD'
 */
export function occurrenceDateAt(dataInizio, oraPrevista, ore, k) {
  if (isCivilDayStride(ore)) return addDays(dataInizio, k * (ore / 24));
  const anchorMs = new Date(`${dataInizio}T${oraPrevista}:00`).getTime();
  return isoDateLocal(new Date(anchorMs + k * ore * MS_PER_HOUR));
}

/**
 * Il piu piccolo k >= 0 con `${occurrenceDateAt(k)}T${oraPrevista}` >= boundaryIso.
 *
 * Una sola funzione serve entrambi i chiamanti (Q-B=(A), emendamento di
 * firma): extendedFrequency passa `${startDate}T00:00`, startBoundary passa
 * T_inizio (secondi inclusi). Il confronto e di STRINGA ISO, come il filtro
 * di visibilita di P20.
 *
 * FORMA: ricerca esponenziale + binaria su predicato MONOTONO. Non c e stima
 * e non c e cap, e la ragione e misurata, non estetica (Q-I2=(A),
 * par.22.198-quindecies-bis):
 *   - monotonia: gli istanti crescono in k e oraPrevista e costante, quindi
 *     la data non decresce mai -> il predicato, una volta vero, resta vero.
 *     Misurata su 563.040 casi: 0 non-monotoni.
 *   - il cap NON e mai stato governabile a ragionamento. La stima floor + bump
 *     richiede fino a 3 correzioni, non 2 come ritenuto: floor undershoot (1)
 *     + troncamento dei secondi del confine (1) + giorno da 25h che assorbe
 *     uno stride di 24.1h (1) SI COMPONGONO. Contro-esempio misurato: ore=24.1,
 *     ancora 2026-10-20T00:00, confine 2026-10-25T00:00:00 -> k corretto 7,
 *     stima floor 4. Un cap 2 sbaglia; un cap 4 e esatto per misura ma resta
 *     un numero magico. Qui il numero non c e.
 *
 * @param {string} dataInizio 'YYYY-MM-DD'
 * @param {string} oraPrevista 'HH:MM'
 * @param {number} ore intervallo_ore
 * @param {string} boundaryIso 'YYYY-MM-DDTHH:MM[:SS]'
 * @returns {number} k intero >= 0
 */
export function firstKOnOrAfterIso(dataInizio, oraPrevista, ore, boundaryIso) {
  const onOrAfter = (k) =>
    `${occurrenceDateAt(dataInizio, oraPrevista, ore, k)}T${oraPrevista}` >=
    boundaryIso;

  if (onOrAfter(0)) return 0;

  // Esponenziale: hi = primo 2^n che soddisfa; lo = hi/2, noto falso.
  let hi = 1;
  while (hi < K_SEARCH_MAX && !onOrAfter(hi)) hi *= 2;

  // Binaria sull invariante: lo falso, hi vero.
  let lo = Math.floor(hi / 2);
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (onOrAfter(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
