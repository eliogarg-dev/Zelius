// Parole approvate da tutti i giocatori di una stanza: un piccolo dizionario in più,
// salvato sul dispositivo dell'host e usato nelle griglie che prepara (anche nell'allenamento).

const CHIAVE = 'zelius.paroleAggiunte';

function leggi(): string[] {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]');
    return Array.isArray(dati) ? dati.filter((p) => typeof p === 'string' && /^[A-Z]{3,30}$/.test(p)) : [];
  } catch {
    return [];
  }
}

export const paroleAggiunte: string[] = $state(leggi());

function salva() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(paroleAggiunte));
  } catch {
    // Archivio non disponibile (navigazione privata): le parole valgono solo per questa sessione.
  }
}

export function aggiungiParola(parola: string) {
  if (paroleAggiunte.includes(parola)) return;
  paroleAggiunte.push(parola);
  paroleAggiunte.sort();
  salva();
}

export function togliParola(parola: string) {
  const i = paroleAggiunte.indexOf(parola);
  if (i < 0) return;
  paroleAggiunte.splice(i, 1);
  salva();
}
