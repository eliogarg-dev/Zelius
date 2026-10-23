import { describe, expect, it } from 'vitest';
import { inSimboli } from '../src/lib/game/alfabeto.ts';
import { casualeConSeme } from '../src/lib/game/griglia.ts';
import {
  calcolaRisultati,
  elencoCifrato,
  elencoNomi,
  generaCodice,
  grigliaDaTesto,
  grigliaInTesto,
  impronta,
  leggiCodice,
  nomeLibero,
  nuovoHost,
} from '../src/lib/stanza/logica.ts';

describe('codice della stanza', () => {
  it('ha 4 caratteri senza lettere ambigue', () => {
    const casuale = casualeConSeme(3);
    for (let i = 0; i < 200; i++) expect(generaCodice(casuale)).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
  });

  it('accetta codici scritti a mano', () => {
    expect(leggiCodice(' k74q ')).toBe('K74Q');
    expect(leggiCodice('K7')).toBeNull();
    expect(leggiCodice('K7-Q')).toBeNull();
    expect(leggiCodice('https://zelius.web.app/s/k74q/')).toBe('K74Q');
  });
});

describe('griglia compatta', () => {
  it('va e torna senza perdite, Qu compresa', () => {
    const griglia = ['c', 'a', 'qu', 'z'].map((l) => inSimboli(l)![0]);
    expect(grigliaInTesto(griglia)).toBe('caqz');
    expect(grigliaDaTesto('caqz')).toEqual(griglia);
  });
});

describe('elenco cifrato', () => {
  it('cambia con il sale e riconosce le parole', () => {
    expect(impronta('CASA', 1)).not.toBe(impronta('CASA', 2));
    expect(impronta('CASA', 1)).toBe(impronta('CASA', 1));
    const elenco = new Set(elencoCifrato(['CASA', 'QUADRO'], 99).split(','));
    expect(elenco.has(impronta('QUADRO', 99))).toBe(true);
    expect(elenco.has(impronta('QUADRI', 99))).toBe(false);
    expect(elencoCifrato(['CASA'], 99)).not.toContain('CASA');
  });

  it('non ha collisioni su migliaia di parole', () => {
    const parole = Array.from({ length: 5000 }, (_, i) => `PAROLA${i.toString(36).toUpperCase()}`);
    expect(new Set(parole.map((p) => impronta(p, 7))).size).toBe(parole.length);
  });
});

describe('risultati della mano', () => {
  const soluzioni = new Set(['CASA', 'QUADRO', 'SQUADRONE', 'ZELIUS']);

  it('dà i punti pieni a tutti quelli che trovano la stessa parola', () => {
    const r = calcolaRisultati(
      {
        giulia: { SQUADRONE: true, CASA: true },
        marco: { CASA: true, QUADRO: true, INVENTATA: true },
        sara: { ZELIUS: true },
      },
      soluzioni,
      { giulia: 5, marco: 1 },
      ['giulia', 'marco', 'sara', 'luca'],
    );
    expect(r.punti).toEqual({ giulia: 11, marco: 4, sara: 10, luca: 0 });
    expect(r.totali).toEqual({ giulia: 16, marco: 5, sara: 10, luca: 0 });
    expect(r.trovate).toEqual({ SQUADRONE: 'giulia', CASA: 'giulia marco', QUADRO: 'marco', ZELIUS: 'sara' });
  });

  it('mantiene i totali di chi non ha giocato questa mano', () => {
    const r = calcolaRisultati({}, soluzioni, { vecchio: 30 }, ['nuovo']);
    expect(r.totali).toEqual({ vecchio: 30, nuovo: 0 });
  });
});

describe('cambio di host', () => {
  const g = (via: 'app' | 'web', online: boolean, entrato: number) => ({ via, online, entrato });

  it('nessun cambio se l\'host è online', () => {
    expect(nuovoHost({ h: g('app', true, 1), a: g('app', true, 2) }, 'h')).toBeNull();
  });

  it('sceglie il giocatore con l\'app online entrato per primo', () => {
    const giocatori = { h: g('app', false, 1), w: g('web', true, 2), b: g('app', true, 4), a: g('app', true, 3), c: g('app', false, 2) };
    expect(nuovoHost(giocatori, 'h')).toBe('a');
  });

  it('nessuno può subentrare se restano solo giocatori dal browser', () => {
    expect(nuovoHost({ h: g('app', false, 1), w: g('web', true, 2) }, 'h')).toBeNull();
  });
});

describe('nomi', () => {
  it('evita nomi doppi', () => {
    expect(nomeLibero('Marco', ['Giulia'])).toBe('Marco');
    expect(nomeLibero('marco', ['Marco', 'Marco 2'])).toBe('marco 3');
    expect(nomeLibero('   ', [])).toBe('Giocatore');
  });

  it('riassume chi ha trovato una parola', () => {
    expect(elencoNomi(['Giulia'])).toBe('Giulia');
    expect(elencoNomi(['Giulia', 'Marco', 'Sara'])).toBe('Giulia, Marco e un altro');
    expect(elencoNomi(['Giulia', 'Marco', 'Sara', 'Luca'])).toBe('Giulia, Marco e altri 2');
  });
});
