// Trova tutte le parole del dizionario presenti in una griglia.

import { inParola, numeroLettere } from './alfabeto.ts';
import type { Dizionario } from './dawg.ts';
import { punti } from './punteggio.ts';

export interface Soluzione {
  parola: string;
  lettere: number;
  punti: number;
  /** Indici delle caselle, nell'ordine in cui si toccano. */
  percorso: number[];
}

/** Caselle adiacenti (anche in diagonale) a ogni casella di una griglia lato×lato. */
export function adiacenze(lato: number): number[][] {
  const vicini: number[][] = [];
  for (let r = 0; r < lato; r++) {
    for (let c = 0; c < lato; c++) {
      const v: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < lato && cc >= 0 && cc < lato) v.push(rr * lato + cc);
        }
      }
      vicini.push(v);
    }
  }
  return vicini;
}

/** Lato della griglia a partire dal numero di caselle (16 → 4, 25 → 5). */
export function latoDi(griglia: readonly number[]): number {
  const lato = Math.round(Math.sqrt(griglia.length));
  if (lato * lato !== griglia.length) throw new Error('La griglia deve essere quadrata');
  return lato;
}

/**
 * Tutte le parole lunghe almeno `minLettere` che si possono comporre nella griglia,
 * ordinate per punti (decrescenti) e poi in ordine alfabetico.
 */
export function trovaParole(griglia: readonly number[], diz: Dizionario, minLettere: number): Soluzione[] {
  const vicini = adiacenze(latoDi(griglia));
  const usate = new Array<boolean>(griglia.length).fill(false);
  const trovate = new Map<string, Soluzione>();
  const simboli: number[] = [];
  const percorso: number[] = [];

  function esplora(casella: number, nodo: number) {
    const arco = diz.arco(nodo, griglia[casella]);
    if (arco < 0) return;
    usate[casella] = true;
    simboli.push(griglia[casella]);
    percorso.push(casella);

    if (diz.finisceParola(arco)) {
      const lettere = numeroLettere(simboli);
      if (lettere >= minLettere) {
        const parola = inParola(simboli);
        if (!trovate.has(parola)) {
          trovate.set(parola, { parola, lettere, punti: punti(parola, lettere), percorso: [...percorso] });
        }
      }
    }
    const figlio = diz.figlio(arco);
    if (figlio !== 0) {
      for (const v of vicini[casella]) if (!usate[v]) esplora(v, figlio);
    }

    usate[casella] = false;
    simboli.pop();
    percorso.pop();
  }

  for (let i = 0; i < griglia.length; i++) esplora(i, diz.radice);

  return [...trovate.values()].sort((a, b) => b.punti - a.punti || a.parola.localeCompare(b.parola));
}

/**
 * Cerca un percorso nella griglia per la sequenza di simboli data.
 * Serve a dire "non è nella griglia" invece di "non è nel dizionario".
 */
export function trovaPercorso(simboli: readonly number[], griglia: readonly number[]): number[] | null {
  if (simboli.length === 0) return null;
  const vicini = adiacenze(latoDi(griglia));
  const usate = new Array<boolean>(griglia.length).fill(false);
  const percorso: number[] = [];

  function prova(casella: number, i: number): boolean {
    if (usate[casella] || griglia[casella] !== simboli[i]) return false;
    usate[casella] = true;
    percorso.push(casella);
    if (i === simboli.length - 1) return true;
    for (const v of vicini[casella]) if (prova(v, i + 1)) return true;
    usate[casella] = false;
    percorso.pop();
    return false;
  }

  for (let c = 0; c < griglia.length; c++) if (prova(c, 0)) return percorso;
  return null;
}

/** Vero se ogni casella del percorso è adiacente alla precedente e non è ripetuta. */
export function percorsoValido(percorso: readonly number[], lato: number): boolean {
  const vicini = adiacenze(lato);
  const viste = new Set<number>();
  for (let i = 0; i < percorso.length; i++) {
    const c = percorso[i];
    if (c < 0 || c >= lato * lato || viste.has(c)) return false;
    if (i > 0 && !vicini[percorso[i - 1]].includes(c)) return false;
    viste.add(c);
  }
  return percorso.length > 0;
}
