// Punteggio come su ilgiocodelparoliere.it, più la parola speciale ZAPP.

export const PAROLA_SPECIALE = 'ZAPP';
export const PUNTI_PAROLA_SPECIALE = 10;

const TABELLA: Record<number, number> = { 4: 1, 5: 2, 6: 3, 7: 5, 8: 8 };

/** Punti per una parola lunga `lettere` (Qu conta 2). */
export function puntiPerLunghezza(lettere: number): number {
  if (lettere < 4) return 0;
  if (lettere <= 8) return TABELLA[lettere];
  return Math.min(10 + (lettere - 9) * 2, 24);
}

/** Punti per una parola, già in maiuscolo come la mostra il gioco. */
export function punti(parola: string, lettere: number): number {
  if (parola === PAROLA_SPECIALE) return PUNTI_PAROLA_SPECIALE;
  return puntiPerLunghezza(lettere);
}
