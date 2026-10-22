// Controllo di una parola proposta durante la mano.
// Il controllo sul dizionario è passato da fuori: nell'allenamento si usa l'elenco
// delle soluzioni, nelle stanze l'elenco cifrato caricato dall'host.

import { inParola, inSimboli, numeroLettere } from './alfabeto.ts';
import { punti } from './punteggio.ts';
import { trovaPercorso } from './risolutore.ts';

export type Esito =
  | { ok: true; parola: string; lettere: number; punti: number; percorso: number[] }
  | { ok: false; motivo: 'caratteri' | 'corta' | 'griglia' | 'gia' | 'dizionario'; parola: string };

export const MESSAGGI: Record<Exclude<Esito, { ok: true }>['motivo'], string> = {
  caratteri: 'contiene lettere non ammesse',
  corta: 'è troppo corta',
  griglia: 'non è nella griglia',
  gia: 'l\'hai già trovata',
  dizionario: 'non è nel dizionario',
};

export interface Proposta {
  /** Parola scritta con la tastiera, oppure i simboli tracciati sulla griglia. */
  testo?: string;
  simboli?: number[];
  percorso?: number[];
}

export async function verificaParola(
  proposta: Proposta,
  griglia: readonly number[],
  minLettere: number,
  trovate: ReadonlySet<string>,
  nelDizionario: (parola: string) => boolean | Promise<boolean>,
): Promise<Esito> {
  const simboli = proposta.simboli ?? inSimboli(proposta.testo ?? '');
  if (!simboli || simboli.length === 0) return { ok: false, motivo: 'caratteri', parola: (proposta.testo ?? '').toUpperCase() };
  const parola = inParola(simboli);
  const lettere = numeroLettere(simboli);
  if (lettere < minLettere) return { ok: false, motivo: 'corta', parola };
  const percorso = proposta.percorso ?? trovaPercorso(simboli, griglia);
  if (!percorso) return { ok: false, motivo: 'griglia', parola };
  if (trovate.has(parola)) return { ok: false, motivo: 'gia', parola };
  if (!(await nelDizionario(parola))) return { ok: false, motivo: 'dizionario', parola };
  return { ok: true, parola, lettere, punti: punti(parola, lettere), percorso };
}
