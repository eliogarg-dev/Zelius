// Prepara il dizionario del gioco a partire da Morph-it!.
//
// Uso:   node scripts/prepara-dizionario.ts
// Legge: data/raw/morphit/current_version/morph-it_048.txt (scaricato a parte, vedi README)
// Scrive:
//   public/dizionario.bin          DAWG compresso usato dal gioco
//   src/lib/game/frequenze.json    pesi delle lettere per generare le griglie
//   data/parole.txt                elenco delle parole accettate (per controllo, non versionato)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inSimboli, numeroLettere, inParola, NUM_SIMBOLI } from '../src/lib/game/alfabeto.ts';
import { costruisciDawg, Dizionario } from '../src/lib/game/dawg.ts';
import { PAROLA_SPECIALE } from '../src/lib/game/punteggio.ts';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const sorgente = join(radice, 'data/raw/morphit/current_version/morph-it_048.txt');

// Categorie da scartare: nomi propri, abbreviazioni, simboli, punteggiatura, faccine.
const CATEGORIE_ESCLUSE = new Set(['NPR', 'ABL', 'SYM', 'PON', 'SENT', 'SMI']);
const CATEGORIE_VERBALI = new Set(['VER', 'AUX', 'MOD', 'ASP', 'CAU']);
// Tratti ammessi nelle etichette verbali: tutto il resto (lo, si, sene, ...) è un pronome attaccato.
const TRATTI_VERBALI = new Set([
  'ind', 'sub', 'cond', 'impr', 'inf', 'part', 'ger',
  'pres', 'impf', 'past', 'fut',
  '1', '2', '3', 's', 'p', 'm', 'f',
]);
const SOLO_LETTERE = /^[a-zàáèéìíòóùú]+$/;
const MIN_LETTERE = 4;
const MAX_SIMBOLI = 25;

function haPronomiAttaccati(etichetta: string): boolean {
  const [testa, ...resto] = etichetta.split('+');
  const [categoria, modo] = testa.split(':');
  if (!CATEGORIE_VERBALI.has(categoria)) return false;
  return [modo, ...resto].some((t) => t !== undefined && !TRATTI_VERBALI.has(t));
}

const testo = new TextDecoder('latin1').decode(readFileSync(sorgente));
const parole = new Map<string, number[]>();
const scarti = { categoria: 0, pronomi: 0, caratteri: 0, lunghezza: 0 };

for (const riga of testo.split('\n')) {
  const [forma, , etichetta] = riga.trim().split('\t');
  if (!forma || !etichetta) continue;
  const categoria = etichetta.split(/[:+-]/)[0];
  if (CATEGORIE_ESCLUSE.has(categoria)) { scarti.categoria++; continue; }
  if (haPronomiAttaccati(etichetta)) { scarti.pronomi++; continue; }
  if (!SOLO_LETTERE.test(forma)) { scarti.caratteri++; continue; }
  const simboli = inSimboli(forma);
  if (!simboli) { scarti.caratteri++; continue; }
  if (numeroLettere(simboli) < MIN_LETTERE || simboli.length > MAX_SIMBOLI) { scarti.lunghezza++; continue; }
  parole.set(inParola(simboli), simboli);
}

const speciale = inSimboli(PAROLA_SPECIALE)!;
parole.set(PAROLA_SPECIALE, speciale);

const ordinate = [...parole.keys()].sort();
const archi = costruisciDawg(ordinate.map((p) => parole.get(p)!));

// Controllo: ogni parola deve essere ritrovata nel DAWG.
const diz = new Dizionario(archi);
for (const p of ordinate) {
  if (!diz.contiene(parole.get(p)!)) throw new Error(`Parola persa nel DAWG: ${p}`);
}

// Frequenze delle lettere sulle parole accettate.
const conteggi = new Array<number>(NUM_SIMBOLI).fill(0);
for (const simboli of parole.values()) for (const s of simboli) conteggi[s]++;
const totale = conteggi.reduce((a, b) => a + b, 0);
const pesi = conteggi.map((c) => Math.round((c / totale) * 10000));

mkdirSync(join(radice, 'public'), { recursive: true });
writeFileSync(join(radice, 'public/dizionario.bin'), Buffer.from(archi.buffer));
writeFileSync(
  join(radice, 'src/lib/game/frequenze.json'),
  JSON.stringify({ fonte: 'Morph-it! 0.4.8, parole accettate dal gioco', pesi }, null, 2) + '\n',
);
writeFileSync(join(radice, 'data/parole.txt'), ordinate.join('\n') + '\n');

console.log(`Parole accettate: ${ordinate.length}`);
console.log(`Scartate: ${JSON.stringify(scarti)}`);
console.log(`Archi DAWG: ${archi.length} (${(archi.byteLength / 1024 / 1024).toFixed(2)} MB)`);
