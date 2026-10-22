// Alfabeto del Paroliere: 21 lettere italiane, senza J, K, X, Y, W.
// La Q esiste solo come casella unica "Qu": nel gioco è un simbolo solo,
// ma conta 2 lettere per lunghezza e punteggio.

export const LETTERE = 'abcdefghilmnopqrstuvz';
export const NUM_SIMBOLI = LETTERE.length; // 21
export const SIMBOLO_QU = LETTERE.indexOf('q');

const INDICE = new Map<string, number>([...LETTERE].map((l, i) => [l, i]));

/** Toglie accenti e maiuscole: "Città" → "citta". */
export function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Converte una parola nei simboli del gioco ("qu" diventa un simbolo solo).
 * Restituisce null se la parola contiene caratteri non ammessi o una Q non seguita da U.
 */
export function inSimboli(parola: string): number[] | null {
  const p = normalizza(parola);
  const simboli: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === 'q') {
      if (p[i + 1] !== 'u') return null;
      simboli.push(SIMBOLO_QU);
      i++;
      continue;
    }
    const s = INDICE.get(c);
    if (s === undefined) return null;
    simboli.push(s);
  }
  return simboli;
}

/** Simboli → parola maiuscola da mostrare ("QUADRO"). */
export function inParola(simboli: readonly number[]): string {
  return simboli.map((s) => (s === SIMBOLO_QU ? 'QU' : LETTERE[s].toUpperCase())).join('');
}

/** Numero di lettere, con Qu che conta 2. */
export function numeroLettere(simboli: readonly number[]): number {
  let n = simboli.length;
  for (const s of simboli) if (s === SIMBOLO_QU) n++;
  return n;
}

/** Testo da mostrare sulla casella: "Qu" oppure la lettera maiuscola. */
export function etichettaCasella(simbolo: number): string {
  return simbolo === SIMBOLO_QU ? 'Qu' : LETTERE[simbolo].toUpperCase();
}
