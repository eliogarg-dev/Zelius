// Prepara il Dizionario Zelius unendo Morph-it!, paroleitaliane di Napolux, Wikizionario
// e le voci italiane del Wiktionary inglese (che ha le tabelle di coniugazione e flessione complete),
// più le forme generate da noi: verbi con pronomi attaccati (mangiarlo, dammelo, lavandosi),
// alterati (tavolino, tavolaccio) e avverbi (rapidamente, velocissimamente).
//
// Uso:   node scripts/prepara-dizionario.ts
// Legge:
//   data/raw/morphit/current_version/morph-it_048.txt   (scaricato a parte, vedi README)
//   data/raw/napolux/*.txt, data/raw/wikizionario/*.gz, data/raw/wiktionary/*.gz  (scaricati da soli se mancano)
// Scrive:
//   public/dizionario.bin          DAWG compresso usato dal gioco
//   src/lib/game/frequenze.json    pesi delle lettere per generare le griglie
//   data/parole.txt                elenco delle parole accettate (per controllo, non versionato)
//   data/scarti.txt                parole delle fonti nuove scartate perché nomi propri (idem)

import { createReadStream, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { inSimboli, numeroLettere, inParola, NUM_SIMBOLI } from '../src/lib/game/alfabeto.ts';
import { costruisciDawg, Dizionario } from '../src/lib/game/dawg.ts';
import { PAROLA_SPECIALE } from '../src/lib/game/punteggio.ts';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const grezzi = join(radice, 'data/raw');
const morphit = join(grezzi, 'morphit/current_version/morph-it_048.txt');

const NAPOLUX = 'https://raw.githubusercontent.com/napolux/paroleitaliane/master/paroleitaliane/';
// La lista da 660000 è esclusa: aggiunge soprattutto forme antiche o sbagliate (difinitiva, sbiescie).
const NAPOLUX_PAROLE = ['60000_parole_italiane.txt', '280000_parole_italiane.txt', 'coniugazione_verbi.txt'];
const NAPOLUX_NOMI = ['9000_nomi_propri.txt', 'lista_cognomi.txt', 'lista_38000_cognomi.txt'];
const WIKIZIONARIO = 'https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz';
const WIKTIONARY = 'https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl.gz';

// Categorie Morph-it da scartare: nomi propri, abbreviazioni, simboli, punteggiatura, faccine.
const CATEGORIE_ESCLUSE = new Set(['NPR', 'ABL', 'SYM', 'PON', 'SENT', 'SMI']);
const CATEGORIE_VERBALI = new Set(['VER', 'AUX', 'MOD', 'ASP', 'CAU']);
// Parti del discorso dei Wiktionary da scartare (i nomi propri finiscono nella lista nera).
const POS_ESCLUSE = new Set([
  'name', 'abbrev', 'symbol', 'character', 'prefix', 'suffix', 'affix', 'interfix', 'num', 'punct', 'contraction',
]);
// Righe delle tabelle del Wiktionary inglese che non sono forme della parola.
const TAG_NON_FORME = new Set(['table-tags', 'inflection-template', 'auxiliary', 'dialectal', 'misspelling']);
// Voci del Wiktionary inglese da non prendere se lo sono in tutti i significati.
const TAG_VOCI_ESCLUSE = ['misspelling', 'abbreviation', 'dialectal'];
// Pronomi che si attaccano ai verbi, soli o a coppie (dammelo, andandosene, glielo).
const PRONOMI = [
  'mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'ne', 'gli',
  ...['me', 'te', 'se', 'ce', 've', 'glie'].flatMap((p) => ['lo', 'la', 'li', 'le', 'ne'].map((q) => p + q)),
].map((c) => c.toUpperCase());
// All'imperativo il "si" non si attacca: lavati, laviamoci, lavatevi.
const PRONOMI_IMPERATIVO = PRONOMI.filter((p) => !p.startsWith('S'));
// Imperativi monosillabi: raddoppiano la consonante del pronome (dammi, fallo, dillo, stacci, vattene).
const MONOSILLABI = new Set(['DA', 'FA', 'DI', 'STA', 'VA']);
// Varianti dell'imperativo che non prendono pronomi (dai, fai, stai, vai).
const SENZA_PRONOMI = new Set(['DAI', 'FAI', 'STAI', 'VAI']);
// Alterati: diminutivi, vezzeggiativi, accrescitivi, peggiorativi, ognuno in quattro forme.
const ALTERATI = [
  ['INO', 'INA', 'INI', 'INE'], ['ETTO', 'ETTA', 'ETTI', 'ETTE'], ['ELLO', 'ELLA', 'ELLI', 'ELLE'],
  ['UCCIO', 'UCCIA', 'UCCI', 'UCCE'], ['OTTO', 'OTTA', 'OTTI', 'OTTE'], ['ONE', 'ONA', 'ONI'],
  ['ACCIO', 'ACCIA', 'ACCI', 'ACCE'],
].flat();
// Parole che non si alterano con la regola semplice (lezioncina, cartoncino) o non si alterano affatto:
// derivati da verbi (sfaldamento, vendicatore, capigliatura, laureando), avverbi, demonimi (trapanese),
// participi presenti (insegnante; dente e paese invece sì).
const NON_ALTERABILI = /(ONE|ZIONE|SIONE|ISMO|ISTA|[AI]MENTO|MENTE|[AE]NDO|[AI]TORE|[AIU]TURA|[^AEIOU]ESE|.{3}[AE]NTE)$/;
// Gli aggettivi che si alterano davvero sono quelli brevi e comuni (bellino, grassotto, cattivello).
const MAX_AGGETTIVO_ALTERABILE = 7;
const SOLO_LETTERE = /^[a-zàáèéìíòóùú]+$/;
const MIN_LETTERE = 4;
const MAX_SIMBOLI = 25;

/** Forma normalizzata come chiave ("QUADRO"), o null se non è scrivibile con l'alfabeto del gioco. */
function chiave(forma: string): string | null {
  const simboli = inSimboli(forma.replace(/'/g, ''));
  return simboli ? inParola(simboli) : null;
}

async function scarica(url: string, destinazione: string) {
  if (existsSync(destinazione)) return;
  console.log(`Scarico ${url}`);
  mkdirSync(dirname(destinazione), { recursive: true });
  const risposta = await fetch(url);
  if (!risposta.ok) throw new Error(`Download fallito (${risposta.status}): ${url}`);
  writeFileSync(destinazione, Buffer.from(await risposta.arrayBuffer()));
}

function righe(percorso: string): string[] {
  return readFileSync(percorso, 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
}

// Forme verbali a cui attaccare i pronomi.
const infiniti = new Set<string>();
const gerundi = new Set<string>();
// Imperativi di 2ª singolare e 1ª e 2ª plurale (mangia, mangiamo, mangiate).
const imperativi = new Set<string>();
// Nomi di Morph-it al singolare e aggettivi al maschile singolare, da cui generare alterati e avverbi.
// Gli aggettivi graduabili sono quelli con il superlativo in Morph-it (bello, bellissimo).
const nomi = new Set<string>();
const aggettivi = new Set<string>();
const graduabili = new Set<string>();
const superlativi = new Set<string>();

// --- Morph-it ---

const accettate = new Map<string, number[]>();
const nomiPropri = new Set<string>();
// Nomi e cognomi di Napolux e del Wiktionary inglese: molti sono anche parole comuni (pivieri, aceti),
// quindi valgono meno.
const nomiDeboli = new Set<string>();
const scartiMorphit = { categoria: 0, caratteri: 0, lunghezza: 0 };

for (const riga of new TextDecoder('latin1').decode(readFileSync(morphit)).split('\n')) {
  const [forma, , etichetta] = riga.trim().split('\t');
  if (!forma || !etichetta) continue;
  const categoria = etichetta.split(/[:+-]/)[0];
  const k = chiave(forma.toLowerCase());
  if (categoria === 'NPR' && k) nomiPropri.add(k);
  if (CATEGORIE_ESCLUSE.has(categoria)) { scartiMorphit.categoria++; continue; }
  if (k && CATEGORIE_VERBALI.has(categoria)) {
    // Etichette come VER:impr+pres+2+s; quelle con pronomi (VER:inf+lo) hanno già il pronome.
    const [modo, , persona, numero, ...altro] = etichetta.split(/[:+]/).slice(1);
    if (modo === 'inf' && persona === undefined) infiniti.add(k);
    if (modo === 'ger' && persona === undefined) gerundi.add(k);
    if (modo === 'impr' && altro.length === 0 && (persona === '2' || (persona === '1' && numero === 'p'))) imperativi.add(k);
  }
  // Le parole tronche (città, virtù) non si alterano con la regola.
  if (k && categoria === 'NOUN' && etichetta.endsWith(':s') && !/[àèéìíòóùú]$/.test(forma)) nomi.add(k);
  if (k && etichetta === 'ADJ:pos+m+s') aggettivi.add(k);
  const lemma = riga.split('	')[1];
  if (k && lemma && etichetta === 'ADJ:sup+m+s') {
    superlativi.add(k);
    const kl = chiave(lemma.toLowerCase());
    if (kl) graduabili.add(kl);
  }
  if (!SOLO_LETTERE.test(forma)) { scartiMorphit.caratteri++; continue; }
  const simboli = inSimboli(forma);
  if (!simboli) { scartiMorphit.caratteri++; continue; }
  if (numeroLettere(simboli) < MIN_LETTERE || simboli.length > MAX_SIMBOLI) { scartiMorphit.lunghezza++; continue; }
  accettate.set(inParola(simboli), simboli);
}
const daMorphit = accettate.size;

// --- Fonti nuove ---

for (const f of [...NAPOLUX_PAROLE, ...NAPOLUX_NOMI]) await scarica(NAPOLUX + f, join(grezzi, 'napolux', f));
const fileWikizionario = join(grezzi, 'wikizionario/raw-wiktextract-data.jsonl.gz');
await scarica(WIKIZIONARIO, fileWikizionario);
const fileWiktionary = join(grezzi, 'wiktionary/kaikki.org-dictionary-Italian.jsonl.gz');
await scarica(WIKTIONARY, fileWiktionary);

for (const f of NAPOLUX_NOMI) {
  for (const nome of righe(join(grezzi, 'napolux', f))) {
    const k = chiave(nome.toLowerCase());
    if (k) nomiDeboli.add(k);
  }
}

// Candidate dalle fonti nuove, con la prima fonte che le ha portate.
const candidate = new Map<string, string>();
// Nomi, aggettivi, avverbi... dei Wiktionary: valgono anche se sono pure nomi o cognomi (pivieri).
const comuni = new Set<string>();
// Le coniugazioni non sono cognomi anche se ci somigliano (toppano, infratta).
const coniugazioni = new Set<string>();
for (const f of NAPOLUX_PAROLE) {
  for (const p of righe(join(grezzi, 'napolux', f))) {
    if (!candidate.has(p)) candidate.set(p, 'paroleitaliane');
    const k = f === 'coniugazione_verbi.txt' && chiave(p);
    if (k) coniugazioni.add(k);
  }
}

const lettore = createInterface({ input: createReadStream(fileWikizionario).pipe(createGunzip()), crlfDelay: Infinity });
for await (const riga of lettore) {
  const voce = JSON.parse(riga) as {
    word: string; lang_code: string; pos: string; pos_title: string; forms?: { form: string; tags?: string[] }[];
  };
  if (voce.lang_code !== 'it') continue;
  // Verbi che Morph-it non conosce (attuffare → attuffandosi).
  if (voce.pos_title === 'Verbo') {
    const k = chiave(voce.word);
    if (k) infiniti.add(k);
    for (const f of voce.forms ?? []) {
      const kf = chiave(f.form);
      if (kf && f.tags?.includes('gerund')) gerundi.add(kf);
    }
  }
  if (voce.pos === 'name') {
    const k = chiave(voce.word.toLowerCase());
    if (k) nomiPropri.add(k);
    continue;
  }
  if (POS_ESCLUSE.has(voce.pos) || voce.word !== voce.word.toLowerCase()) continue;
  const kw = chiave(voce.word);
  if (kw && voce.pos_title === 'Aggettivo') aggettivi.add(kw);
  for (const p of [voce.word, ...(voce.forms ?? []).map((f) => f.form)]) {
    if (!candidate.has(p)) candidate.set(p, 'wikizionario');
    const k = chiave(p);
    if (k && voce.pos !== 'verb') comuni.add(k);
  }
}

// Wiktionary inglese: tutte le voci sono italiane, con le forme flesse etichettate.
const lettoreEn = createInterface({ input: createReadStream(fileWiktionary).pipe(createGunzip()), crlfDelay: Infinity });
for await (const riga of lettoreEn) {
  const voce = JSON.parse(riga) as {
    word: string; pos: string; senses?: { tags?: string[] }[]; forms?: { form: string; tags?: string[] }[];
  };
  if (voce.pos === 'name') {
    const k = chiave(voce.word.toLowerCase());
    if (k) nomiDeboli.add(k);
    continue;
  }
  if (POS_ESCLUSE.has(voce.pos) || voce.word !== voce.word.toLowerCase()) continue;
  const sensi = voce.senses ?? [];
  if (TAG_VOCI_ESCLUSE.some((tag) => sensi.length > 0 && sensi.every((s) => s.tags?.includes(tag)))) continue;
  const forme = (voce.forms ?? []).filter((f) => !f.tags?.some((t) => TAG_NON_FORME.has(t)));
  const kw = chiave(voce.word);
  if (kw && voce.pos === 'adj' && !(sensi.length > 0 && sensi.every((s) => s.tags?.includes('form-of')))) aggettivi.add(kw);
  // Le tabelle dei verbi pronominali (lavarsi) hanno già i pronomi: si generano da quelle di lavare.
  if (voce.pos === 'verb' && voce.word.endsWith('re')) {
    for (const f of forme) {
      const kf = chiave(f.form);
      const t = f.tags ?? [];
      if (!kf) continue;
      if (t.includes('infinitive')) infiniti.add(kf);
      if (t.includes('gerund')) gerundi.add(kf);
      if (t.includes('imperative') && !t.includes('formal') && !t.includes('negative')
        && (t.includes('second-person') || (t.includes('first-person') && t.includes('plural')))) imperativi.add(kf);
    }
  }
  for (const p of [voce.word, ...forme.map((f) => f.form)]) {
    if (!candidate.has(p)) candidate.set(p, 'wiktionary');
    const k = chiave(p);
    if (k && voce.pos !== 'verb') comuni.add(k);
  }
}

const perFonte: Record<string, number> = {
  paroleitaliane: 0, wikizionario: 0, wiktionary: 0, regolari: 0, 'con pronomi': 0, alterati: 0, avverbi: 0,
};
const scartiNuove = { caratteri: 0, lunghezza: 0, nomi: 0 };
const esempiNomi: string[] = [];

function aggiungi(forma: string, fonte: string): boolean {
  const simboli = inSimboli(forma);
  if (!simboli) { scartiNuove.caratteri++; return false; }
  const parola = inParola(simboli);
  if (accettate.has(parola)) return false;
  if (numeroLettere(simboli) < MIN_LETTERE || simboli.length > MAX_SIMBOLI) { scartiNuove.lunghezza++; return false; }
  accettate.set(parola, simboli);
  perFonte[fonte]++;
  return true;
}

for (const [forma, fonte] of candidate) {
  if (!SOLO_LETTERE.test(forma)) { scartiNuove.caratteri++; continue; }
  const k = chiave(forma);
  if (k && accettate.has(k)) continue;
  if (k && (nomiPropri.has(k) || (nomiDeboli.has(k) && !comuni.has(k) && !coniugazioni.has(k)))) {
    scartiNuove.nomi++;
    esempiNomi.push(k);
    continue;
  }
  aggiungi(forma, fonte);
}

// --- Forme regolari che le fonti non danno per tutti i verbi: gerundio e imperativo "voi" ---

for (const inf of infiniti) {
  const m = /^(.*)([AEI])RE$/.exec(inf);
  if (!m || /(FARE|DIRE|BERE)$/.test(inf) || ['ESSERE', 'AVERE', 'SAPERE'].includes(inf)) continue;
  const [, radice, vocale] = m;
  const gerundio = radice + (vocale === 'A' ? 'ANDO' : 'ENDO');
  const voi = radice + vocale + 'TE';
  gerundi.add(gerundio);
  imperativi.add(voi);
  aggiungi(gerundio, 'regolari');
  aggiungi(voi, 'regolari');
}

// --- Pronomi attaccati: infinito senza la e finale (mangiar-lo, por-lo), gerundio, imperativo ---

for (const inf of infiniti) {
  if (!inf.endsWith('RE')) continue;
  const tronco = inf.endsWith('RRE') ? inf.slice(0, -2) : inf.slice(0, -1);
  for (const p of PRONOMI) aggiungi(tronco + p, 'con pronomi');
}
for (const ger of gerundi) for (const p of PRONOMI) aggiungi(ger + p, 'con pronomi');
for (const imp of imperativi) {
  if (SENZA_PRONOMI.has(imp)) continue;
  for (const p of PRONOMI_IMPERATIVO) {
    const doppia = MONOSILLABI.has(imp) && !p.startsWith('GL') ? p[0] : '';
    aggiungi(imp + doppia + p, 'con pronomi');
  }
}

// --- Alterati e avverbi ---

/**
 * Radice di un nome o aggettivo singolare per attaccarci un suffisso, che cambia
 * se il suffisso comincia per e/i (fuoch-ino, bac-ino, voc-ina) o per a/o/u (fuoc-one, baci-one, voci-ona).
 */
function radici(base: string): { ei: string; aou: string } | null {
  if (!/^.{3,}[AEO]$/.test(base)) return null;
  const r = base.slice(0, -1);
  if (/[CG]I$/.test(r)) return { ei: r.slice(0, -1), aou: r }; // bacio, valigia
  if (/[AEIOU]$/.test(r)) return null; // zio, idea, studio: alterati irregolari
  if (/[CG]$/.test(r)) return base.endsWith('E') ? { ei: r, aou: r + 'I' } : { ei: r + 'H', aou: r };
  return { ei: r, aou: r };
}

const conSuffisso = (base: string, suffisso: string) => {
  const r = radici(base);
  return r && (/^[EI]/.test(suffisso) ? r.ei : r.aou) + suffisso;
};

const basi = new Set(
  [...nomi, ...[...graduabili].filter((a) => a.length <= MAX_AGGETTIVO_ALTERABILE)].filter((b) => !NON_ALTERABILI.test(b)),
);
// Una base già alterata (tavolino da tavolo, polsonetto da polsone) non si altera di nuovo.
const giaAlterata = (base: string) => ALTERATI.some((s) => {
  if (!base.endsWith(s)) return false;
  const r = base.slice(0, -s.length);
  return ['O', 'A', 'E', 'HO', 'HA', 'IO', 'IA'].some((v) => basi.has(r + v) || basi.has(r.replace(/H$/, '') + v));
});
for (const base of basi) {
  if (nomiPropri.has(base) || giaAlterata(base)) continue;
  for (const s of ALTERATI) {
    const p = conSuffisso(base, s);
    if (p) aggiungi(p, 'alterati');
  }
}

/** Avverbio in -mente: rapido → rapidamente, facile → facilmente, veloce → velocemente. */
function avverbio(aggettivo: string): string | null {
  if (aggettivo.endsWith('O')) return aggettivo.slice(0, -1) + 'AMENTE';
  if (/[AEIOU][LR]E$/.test(aggettivo)) return aggettivo.slice(0, -1) + 'MENTE';
  if (aggettivo.endsWith('E')) return aggettivo + 'MENTE';
  return null;
}

for (const a of [...aggettivi, ...superlativi]) {
  const p = !nomiPropri.has(a) && avverbio(a);
  if (p) aggiungi(p, 'avverbi');
}

accettate.set(PAROLA_SPECIALE, inSimboli(PAROLA_SPECIALE)!);

// --- DAWG, controllo, frequenze ---

const ordinate = [...accettate.keys()].sort();
const archi = costruisciDawg(ordinate.map((p) => accettate.get(p)!));

// Controllo: ogni parola deve essere ritrovata nel DAWG.
const diz = new Dizionario(archi);
for (const p of ordinate) {
  if (!diz.contiene(accettate.get(p)!)) throw new Error(`Parola persa nel DAWG: ${p}`);
}

// Frequenze delle lettere sulle parole accettate.
const conteggi = new Array<number>(NUM_SIMBOLI).fill(0);
for (const simboli of accettate.values()) for (const s of simboli) conteggi[s]++;
const totale = conteggi.reduce((a, b) => a + b, 0);
const pesi = conteggi.map((c) => Math.round((c / totale) * 10000));

mkdirSync(join(radice, 'public'), { recursive: true });
writeFileSync(join(radice, 'public/dizionario.bin'), Buffer.from(archi.buffer));
writeFileSync(
  join(radice, 'src/lib/game/frequenze.json'),
  JSON.stringify({
    fonte: 'Dizionario Zelius (Morph-it!, Wikizionario, Wiktionary, paroleitaliane), parole accettate dal gioco',
    pesi,
  }, null, 2) + '\n',
);
writeFileSync(join(radice, 'data/parole.txt'), ordinate.join('\n') + '\n');
writeFileSync(join(radice, 'data/scarti.txt'), esempiNomi.join('\n') + '\n');

const campione = (l: string[]) => l.filter((_, i) => i % Math.max(1, Math.floor(l.length / 15)) === 0).slice(0, 15).join(' ');
console.log(`Parole accettate: ${ordinate.length} (Morph-it ${daMorphit}, ${JSON.stringify(perFonte)})`);
console.log(`Verbi: ${infiniti.size} infiniti, ${gerundi.size} gerundi, ${imperativi.size} imperativi`);
console.log(`Basi: ${basi.size} per gli alterati, ${aggettivi.size} aggettivi per gli avverbi`);
console.log(`Scartate da Morph-it: ${JSON.stringify(scartiMorphit)}`);
console.log(`Scartate dalle fonti nuove: ${JSON.stringify(scartiNuove)}`);
console.log(`  nomi, es.: ${campione(esempiNomi)}`);
console.log(`Archi DAWG: ${archi.length} (${(archi.byteLength / 1024 / 1024).toFixed(2)} MB)`);
