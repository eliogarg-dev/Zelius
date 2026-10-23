// Preferenze del dispositivo: nickname e tema. Restano salvate nel telefono o nel browser.

export type Tema = 'auto' | 'chiaro' | 'scuro';

const CHIAVE = 'zelius.preferenze';

function leggi(): { nickname: string; tema: Tema } {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}');
    return {
      nickname: typeof dati.nickname === 'string' ? dati.nickname : '',
      tema: ['auto', 'chiaro', 'scuro'].includes(dati.tema) ? dati.tema : 'auto',
    };
  } catch {
    return { nickname: '', tema: 'auto' };
  }
}

export const preferenze = $state(leggi());

export function salvaPreferenze() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(preferenze));
  } catch {
    // Archivio non disponibile (navigazione privata): le preferenze valgono solo per questa sessione.
  }
}

const scuroDiSistema = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

/** Applica il tema alla pagina e lo aggiorna se cambia quello del telefono. */
export function applicaTema() {
  const imposta = () => {
    const scuro = preferenze.tema === 'scuro' || (preferenze.tema === 'auto' && (scuroDiSistema?.matches ?? true));
    document.documentElement.dataset.theme = scuro ? 'scuro' : 'chiaro';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scuro ? '#111318' : '#f5f6f8');
  };
  imposta();
  scuroDiSistema?.addEventListener('change', imposta);
  return imposta;
}
