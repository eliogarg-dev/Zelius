// Generazione casuale della griglia, con lettere pesate sulle frequenze dell'italiano.

import { NUM_SIMBOLI } from './alfabeto.ts';
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

const PESI: number[] = frequenze.pesi;
const TOTALE = PESI.reduce((a, b) => a + b, 0);

function estraiSimbolo(casuale: () => number): number {
  let x = casuale() * TOTALE;
  for (let s = 0; s < NUM_SIMBOLI; s++) {
    x -= PESI[s];
    if (x < 0) return s;
  }
  return NUM_SIMBOLI - 1;
}

export function generaGriglia(lato: Lato, casuale: () => number = Math.random): number[] {
  return Array.from({ length: lato * lato }, () => estraiSimbolo(casuale));
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
  casuale: () => number = Math.random,
): Mano {
  let migliore: Mano | null = null;
  for (let tentativo = 0; tentativo < 50; tentativo++) {
    const griglia = generaGriglia(lato, casuale);
    const soluzioni = trovaParole(griglia, diz, minLettere);
    if (!migliore || soluzioni.length > migliore.soluzioni.length) migliore = { griglia, soluzioni };
    if (soluzioni.length >= MIN_PAROLE[lato]) break;
  }
  return migliore!;
}
