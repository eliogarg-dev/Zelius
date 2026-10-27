// Regole delle stanze che non dipendono da Firebase: si possono testare da sole.

import { LETTERE, inSimboli, numeroLettere } from '../game/alfabeto.ts';
import { punti } from '../game/punteggio.ts';

// ---------- Codice della stanza ----------

/** Lettere e cifre senza quelle che si confondono (0/O, 1/I/L). */
const CARATTERI_CODICE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LUNGHEZZA_CODICE = 4;

export function generaCodice(casuale: () => number = Math.random): string {
  let c = '';
  for (let i = 0; i < LUNGHEZZA_CODICE; i++) c += CARATTERI_CODICE[Math.floor(casuale() * CARATTERI_CODICE.length)];
  return c;
}

/** Normalizza un codice scritto a mano ("k74q " → "K74Q"); null se non valido. */
export function leggiCodice(testo: string): string | null {
  // Accetta anche il link del QR code: https://…/s/K74Q
  const c = testo.trim().replace(/^.*\/s\//i, '').replace(/\/$/, '').toUpperCase();
  if (c.length !== LUNGHEZZA_CODICE) return null;
  return [...c].every((ch) => CARATTERI_CODICE.includes(ch)) ? c : null;
}

// ---------- Griglia in forma compatta ----------

/** [simboli] → "cartsqea..." (la q indica la casella Qu). */
export function grigliaInTesto(griglia: readonly number[]): string {
  return griglia.map((s) => LETTERE[s]).join('');
}

export function grigliaDaTesto(testo: string): number[] {
  return [...testo].map((ch) => LETTERE.indexOf(ch));
}

// ---------- Elenco cifrato delle parole ----------

/**
 * Impronta di una parola con un "sale" diverso per ogni mano (cyrb53, 53 bit).
 * Non è crittografia: serve solo a non mostrare le soluzioni in chiaro durante la mano.
 * È sincrona e funziona anche su pagine non https (es. prove in rete locale).
 */
export function impronta(parola: string, sale: number): string {
  let h1 = 0xdeadbeef ^ sale;
  let h2 = 0x41c6ce57 ^ sale;
  for (let i = 0; i < parola.length; i++) {
    const ch = parola.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function elencoCifrato(parole: readonly string[], sale: number): string {
  return parole.map((p) => impronta(p, sale)).join(',');
}

// ---------- Risultati di una mano ----------

export interface RisultatiMano {
  /** Punti fatti in questa mano da ogni giocatore. */
  punti: Record<string, number>;
  /** Totale dopo questa mano. */
  totali: Record<string, number>;
  /** Per ogni parola trovata, gli uid di chi l'ha trovata separati da spazio. */
  trovate: Record<string, string>;
}

/**
 * Calcola i risultati: ogni parola valida vale i punti pieni a chiunque la trovi.
 * Le parole non presenti tra le soluzioni (non dovrebbero arrivare) vengono ignorate.
 */
export function calcolaRisultati(
  paroleGiocatori: Record<string, Record<string, unknown> | undefined>,
  soluzioni: ReadonlySet<string>,
  totaliPrecedenti: Record<string, number>,
  partecipanti: readonly string[],
): RisultatiMano {
  const r: RisultatiMano = { punti: {}, totali: { ...totaliPrecedenti }, trovate: {} };
  for (const uid of partecipanti) r.punti[uid] = 0;
  const chi: Record<string, string[]> = {};
  for (const [uid, parole] of Object.entries(paroleGiocatori)) {
    for (const parola of Object.keys(parole ?? {})) {
      if (!soluzioni.has(parola)) continue;
      const simboli = inSimboli(parola);
      if (!simboli) continue;
      r.punti[uid] = (r.punti[uid] ?? 0) + punti(parola, numeroLettere(simboli));
      (chi[parola] ??= []).push(uid);
    }
  }
  for (const [uid, p] of Object.entries(r.punti)) r.totali[uid] = (r.totali[uid] ?? 0) + p;
  for (const [parola, uids] of Object.entries(chi)) r.trovate[parola] = uids.sort().join(' ');
  return r;
}

// ---------- Parole scartate messe ai voti ----------

/** Parole scartate che ogni giocatore può far votare in una mano. */
export const MAX_PROPOSTE = 2;

export type StatoVoto = 'attesa' | 'approvata' | 'rifiutata';

/**
 * Esito del voto su una parola: basta un no per scartarla, ed è approvata quando hanno detto sì
 * tutti gli elettori (i giocatori della mano ancora online) tranne chi l'ha proposta.
 */
export function esitoVoto(
  voti: Record<string, boolean>,
  proponenti: readonly string[],
  elettori: readonly string[],
): { stato: StatoVoto; mancano: string[] } {
  const devono = elettori.filter((uid) => !proponenti.includes(uid));
  if (devono.some((uid) => voti[uid] === false)) return { stato: 'rifiutata', mancano: [] };
  const mancano = devono.filter((uid) => voti[uid] !== true);
  return { stato: mancano.length ? 'attesa' : 'approvata', mancano };
}

/** Per ogni parola proposta, chi l'ha proposta (dalle proposte scritte come uid → [parole]). */
export function proponentiPerParola(proposte: Record<string, Record<string, string> | string[] | undefined>): Map<string, string[]> {
  const chi = new Map<string, string[]>();
  for (const [uid, parole] of Object.entries(proposte)) {
    for (const parola of Object.values(parole ?? {})) {
      if (typeof parola !== 'string') continue;
      const elenco = chi.get(parola) ?? [];
      if (!elenco.includes(uid)) chi.set(parola, [...elenco, uid].sort());
    }
  }
  return chi;
}

// ---------- Cambio di host ----------

export interface GiocatoreElezione {
  via: 'app' | 'web';
  online: boolean;
  entrato: number;
}

/**
 * Se l'host è offline, il nuovo host è il giocatore con l'app online entrato per primo.
 * Restituisce null se l'host è online o se nessuno con l'app può subentrare.
 */
export function nuovoHost(giocatori: Record<string, GiocatoreElezione>, hostAttuale: string): string | null {
  if (giocatori[hostAttuale]?.online) return null;
  const candidati = Object.entries(giocatori)
    .filter(([uid, g]) => uid !== hostAttuale && g.online && g.via === 'app')
    .sort((a, b) => a[1].entrato - b[1].entrato || a[0].localeCompare(b[0]));
  return candidati[0]?.[0] ?? null;
}

/** Nome libero nella stanza: "Marco", poi "Marco 2", "Marco 3"... */
export function nomeLibero(desiderato: string, nomiPresenti: readonly string[]): string {
  const base = desiderato.trim().slice(0, 20) || 'Giocatore';
  const usati = new Set(nomiPresenti.map((n) => n.toLowerCase()));
  if (!usati.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) {
    const n = `${base} ${i}`;
    if (!usati.has(n.toLowerCase())) return n;
  }
}

/** "Giulia", "Giulia, Marco", "Giulia, Marco e altri 3". */
export function elencoNomi(nomi: readonly string[]): string {
  if (nomi.length <= 2) return nomi.join(', ');
  return `${nomi.slice(0, 2).join(', ')} e ${nomi.length - 2 === 1 ? 'un altro' : `altri ${nomi.length - 2}`}`;
}
