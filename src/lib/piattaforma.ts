// App Android (Capacitor) o browser?
// In sviluppo: ?web=1 nell'indirizzo simula il browser, altrimenti ci si comporta come l'app.

interface FinestraCapacitor {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function calcola(): 'app' | 'web' {
  if ((window as FinestraCapacitor).Capacitor?.isNativePlatform?.()) return 'app';
  if (import.meta.env.DEV && !new URLSearchParams(location.search).has('web')) return 'app';
  return 'web';
}

export const piattaforma = calcola();
export const eApp = piattaforma === 'app';

/** Indirizzo pubblico del gioco, usato nei link e nei QR code delle stanze. */
export function linkStanza(codice: string): string {
  const base = import.meta.env.VITE_URL_PUBBLICO || (eApp && !import.meta.env.DEV ? '' : location.origin);
  return `${base.replace(/\/$/, '')}/s/${codice}`;
}

/** Codice della stanza se la pagina è stata aperta da un link /s/CODICE. */
export function codiceDaIndirizzo(): string | null {
  const m = location.pathname.match(/^\/s\/([A-Za-z0-9]{4})\/?$/);
  return m ? m[1].toUpperCase() : null;
}
