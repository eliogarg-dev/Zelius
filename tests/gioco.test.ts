import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inParola, inSimboli, numeroLettere, normalizza, etichettaCasella, SIMBOLO_QU } from '../src/lib/game/alfabeto.ts';
import { costruisciDawg, Dizionario } from '../src/lib/game/dawg.ts';
import { punti, puntiPerLunghezza } from '../src/lib/game/punteggio.ts';
import { adiacenze, percorsoValido, trovaParole, trovaPercorso } from '../src/lib/game/risolutore.ts';
import { casualeConSeme, generaGriglia, MAX_RIPETIZIONI, preparaMano } from '../src/lib/game/griglia.ts';

// Griglia dei mockup:
//   C  A  R  T
//   S  Qu E  A
//   A  D  R  O
//   L  I  N  E
const GRIGLIA = ['c', 'a', 'r', 't', 's', 'qu', 'e', 'a', 'a', 'd', 'r', 'o', 'l', 'i', 'n', 'e'].map(
  (l) => inSimboli(l)![0],
);

function dizionarioDi(parole: string[]): Dizionario {
  const simboli = parole.map((p) => inSimboli(p)!).sort((a, b) => inParola(a).localeCompare(inParola(b)));
  return new Dizionario(costruisciDawg(simboli));
}

describe('alfabeto', () => {
  it('tratta "qu" come un simbolo solo che vale 2 lettere', () => {
    const s = inSimboli('quadro')!;
    expect(s).toHaveLength(5);
    expect(s[0]).toBe(SIMBOLO_QU);
    expect(numeroLettere(s)).toBe(6);
    expect(inParola(s)).toBe('QUADRO');
    expect(etichettaCasella(SIMBOLO_QU)).toBe('Qu');
  });

  it('toglie accenti e maiuscole', () => {
    expect(normalizza(' Città ')).toBe('citta');
    expect(inParola(inSimboli('PERCHÉ')!)).toBe('PERCHE');
  });

  it('rifiuta lettere straniere e Q senza U', () => {
    expect(inSimboli('jeans')).toBeNull();
    expect(inSimboli('taxi')).toBeNull();
    expect(inSimboli('qatar')).toBeNull();
    expect(inSimboli("l'acqua")).toBeNull();
  });
});

describe('dizionario compresso', () => {
  it('ritrova tutte e sole le parole inserite', () => {
    const diz = dizionarioDi(['casa', 'case', 'caso', 'cassa', 'quadro', 'squadra']);
    for (const p of ['casa', 'case', 'caso', 'cassa', 'quadro', 'squadra']) expect(diz.contiene(inSimboli(p)!)).toBe(true);
    for (const p of ['cas', 'casse', 'quadri', 'squadr', 'a']) expect(diz.contiene(inSimboli(p)!)).toBe(false);
  });

  it('condivide i finali uguali', () => {
    const separati = costruisciDawg([inSimboli('mare')!]).length + costruisciDawg([inSimboli('pare')!]).length;
    const insieme = costruisciDawg([inSimboli('mare')!, inSimboli('pare')!].sort((a, b) => a[0] - b[0])).length;
    expect(insieme).toBeLessThan(separati);
  });
});

describe('punteggio', () => {
  it('segue la tabella del sito', () => {
    const attesi: Record<number, number> = { 3: 0, 4: 1, 5: 2, 6: 3, 7: 5, 8: 8, 9: 10, 10: 12, 11: 14, 15: 22, 16: 24, 20: 24 };
    for (const [lettere, p] of Object.entries(attesi)) expect(puntiPerLunghezza(Number(lettere))).toBe(p);
  });

  it('ZELIUS vale 10 punti in totale', () => {
    expect(punti('ZELIUS', 6)).toBe(10);
    expect(punti('ZAPPA', 5)).toBe(2);
  });
});

describe('risolutore', () => {
  it('conosce le caselle vicine', () => {
    const v = adiacenze(4);
    expect(v[0].sort((a, b) => a - b)).toEqual([1, 4, 5]);
    expect(v[5]).toHaveLength(8);
  });

  it('trova le parole della griglia dei mockup', () => {
    const diz = dizionarioDi(['casa', 'carte', 'quadro', 'squadra', 'squadrone', 'ladri', 'nero', 'treno', 'rata']);
    const trovate = trovaParole(GRIGLIA, diz, 4);
    const parole = trovate.map((s) => s.parola);
    expect(parole).toEqual(['SQUADRONE', 'SQUADRA', 'QUADRO', 'CARTE', 'LADRI', 'CASA', 'NERO']);
    const squadrone = trovate[0];
    expect(squadrone.lettere).toBe(9);
    expect(squadrone.punti).toBe(10);
    expect(percorsoValido(squadrone.percorso, 4)).toBe(true);
  });

  it('rispetta la lunghezza minima', () => {
    const diz = dizionarioDi(['casa', 'carte', 'quadro']);
    expect(trovaParole(GRIGLIA, diz, 5).map((s) => s.parola)).toEqual(['QUADRO', 'CARTE']);
  });

  it('aggiunge le parole approvate se sono nella griglia', () => {
    const diz = dizionarioDi(['casa', 'quadro']);
    const parole = trovaParole(GRIGLIA, diz, 4, ['LADRI', 'TRENO', 'CASA', 'SQUA']).map((s) => s.parola);
    expect(parole).toEqual(['QUADRO', 'LADRI', 'CASA', 'SQUA']);
    expect(trovaParole(GRIGLIA, diz, 6, ['LADRI']).map((s) => s.parola)).toEqual(['QUADRO']);
  });

  it('dice se una parola è componibile nella griglia', () => {
    expect(trovaPercorso(inSimboli('squadra')!, GRIGLIA)).toEqual([4, 5, 8, 9, 10, 7]);
    expect(trovaPercorso(inSimboli('treno')!, GRIGLIA)).toBeNull();
    expect(trovaPercorso(inSimboli('caca')!, GRIGLIA)).toBeNull();
  });

  it('riconosce percorsi non validi', () => {
    expect(percorsoValido([0, 1, 2], 4)).toBe(true);
    expect(percorsoValido([0, 2], 4)).toBe(false);
    expect(percorsoValido([0, 1, 0], 4)).toBe(false);
    expect(percorsoValido([], 4)).toBe(false);
  });
});

describe('griglia', () => {
  it('con lo stesso seme genera la stessa griglia', () => {
    expect(generaGriglia(5, casualeConSeme(42))).toEqual(generaGriglia(5, casualeConSeme(42)));
    expect(generaGriglia(4, casualeConSeme(1))).toHaveLength(16);
  });

  it('non ripete troppo la stessa lettera e ha al massimo un Qu', () => {
    for (let seme = 0; seme < 300; seme++) {
      for (const lato of [4, 5] as const) {
        const conteggi = new Map<number, number>();
        for (const s of generaGriglia(lato, casualeConSeme(seme))) conteggi.set(s, (conteggi.get(s) ?? 0) + 1);
        expect(Math.max(...conteggi.values())).toBeLessThanOrEqual(MAX_RIPETIZIONI[lato]);
        expect(conteggi.get(SIMBOLO_QU) ?? 0).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('dizionario vero', () => {
  const buffer = readFileSync(new URL('../public/dizionario.bin', import.meta.url));
  const diz = Dizionario.daBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  it('contiene parole comuni e ZELIUS, ma non nomi propri', () => {
    for (const p of ['casa', 'squadrone', 'citta', 'zelius', 'mangiavamo']) expect(diz.contiene(inSimboli(p)!), p).toBe(true);
    for (const p of ['roma', 'zapp', 'heidegger']) expect(diz.contiene(inSimboli(p)!), p).toBe(false);
  });

  it('aggiunge le fonti nuove', () => {
    // alveolare e altorilievo mancano in Morph-it; pivieri è anche un cognome, ma il Wikizionario lo dà come nome comune.
    for (const p of ['alveolare', 'altorilievo', 'pivieri', 'evolversi']) expect(diz.contiene(inSimboli(p)!), p).toBe(true);
  });

  it('ha i verbi con i pronomi attaccati, anche di verbi che le fonti danno senza', () => {
    const presenti = [
      'mangiarlo', 'porlo', 'esserci', 'andandosene', 'attuffandosi', 'abbiamocela', 'accendetevi', 'laviamoci',
      'dammelo', 'dillo', 'dagli', 'vattene', 'putandolo',
    ];
    for (const p of presenti) expect(diz.contiene(inSimboli(p)!), p).toBe(true);
    // Il "si" non va all'imperativo, e dai/fai non prendono pronomi.
    for (const p of ['lavasi', 'dailo']) expect(diz.contiene(inSimboli(p)!), p).toBe(false);
  });

  it('ha alterati e avverbi generati con le regole ortografiche', () => {
    const presenti = [
      'tavolino', 'tavolaccio', 'fuochino', 'fuocone', 'bacione', 'vocina', 'vociona', 'ragazzona', 'grassotto',
      'rapidamente', 'facilmente', 'velocemente', 'velocissimamente',
    ];
    for (const p of presenti) expect(diz.contiene(inSimboli(p)!), p).toBe(true);
    // Niente alterati di parole tronche, già alterate o derivate da verbi.
    for (const p of ['assurditetto', 'tavolinetta', 'sfaldamentaccio']) expect(diz.contiene(inSimboli(p)!), p).toBe(false);
  });

  it('trova le parole della griglia dei mockup', () => {
    const parole = trovaParole(GRIGLIA, diz, 4).map((s) => s.parola);
    for (const p of ['SQUADRONE', 'SQUADRA', 'QUADRO', 'ORDINE', 'CARTE', 'LADRI', 'CASA', 'NERO']) expect(parole).toContain(p);
  });

  it('prepara una mano 5x5 giocabile in poco tempo', () => {
    const inizio = performance.now();
    const mano = preparaMano(5, 4, diz, [], casualeConSeme(7));
    expect(mano.soluzioni.length).toBeGreaterThanOrEqual(60);
    expect(performance.now() - inizio).toBeLessThan(2000);
  });
});
