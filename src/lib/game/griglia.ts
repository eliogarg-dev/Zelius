// Generazione casuale della griglia, con lettere pesate sulle frequenze dell'italiano.

import { NUM_SIMBOLI, SIMBOLO_QU } from './alfabeto.ts';
import type { Dizionario } from './dawg.ts';
import { trovaParole, type Soluzione } from './risolutore.ts';
import frequenze from './frequenze.json';

export type Lato = 4 | 5;

/** Numero minimo di parole perché una griglia sia giocabile. */
export const MIN_PAROLE: Record<Lato, number> = { 4: 30, 5: 60 };

/** Generatore pseudo-casuale con seme (mulberry32): stessa griglia a parità di seme. */
export function casualeConSeme(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nelle forme flesse del dizionario la Q è rarissima (0,13%): le diamo il peso
// che ha nei testi italiani (circa 0,5%), altrimenti la casella Qu non uscirebbe quasi mai.
const PESI: number[] = frequenze.pesi.map((p, s) => (s === SIMBOLO_QU ? Math.max(p, 50) : p));

/** Quante volte al massimo può comparire la stessa lettera: evita griglie piene di I o di E. */
export const MAX_RIPETIZIONI: Record<Lato, number> = { 4: 3, 5: 4 };

function estraiSimbolo(casuale: () => number, esclusi: ReadonlySet<number>): number {
  const totale = PESI.reduce((t, p, s) => (esclusi.has(s) ? t : t + p), 0);
  let x = casuale() * totale;
  for (let s = 0; s < NUM_SIMBOLI; s++) {
    if (esclusi.has(s)) continue;
    x -= PESI[s];
    if (x < 0) return s;
  }
  return NUM_SIMBOLI - 1;
}

export function generaGriglia(lato: Lato, casuale: () => number = Math.random): number[] {
  const conteggi = new Array<number>(NUM_SIMBOLI).fill(0);
  const esauriti = new Set<number>();
  const griglia: number[] = [];
  for (let i = 0; i < lato * lato; i++) {
    const s = estraiSimbolo(casuale, esauriti);
    griglia.push(s);
    if (++conteggi[s] >= (s === SIMBOLO_QU ? 1 : MAX_RIPETIZIONI[lato])) esauriti.add(s);
  }
  return griglia;
}

export interface Mano {
  griglia: number[];
  soluzioni: Soluzione[];
}

/** Genera griglie finché non ne trova una con abbastanza parole (al massimo 50 tentativi). */
export function preparaMano(
  lato: Lato,
  minLettere: number,
  diz: Dizionario,
  aggiunte: readonly string[] = [],
  casuale: () => number = Math.random,
): Mano {
  let migliore: Mano | null = null;
  for (let tentativo = 0; tentativo < 50; tentativo++) {
    const griglia = generaGriglia(lato, casuale);
    const soluzioni = trovaParole(griglia, diz, minLettere, aggiunte);
    if (!migliore || soluzioni.length > migliore.soluzioni.length) migliore = { griglia, soluzioni };
    if (soluzioni.length >= MIN_PAROLE[lato]) break;
  }
  return migliore!;
}
