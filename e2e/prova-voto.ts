// Prova del voto sulle parole scartate, contro gli emulatori di Firebase
// (con `npx vite --mode emulatore --port 5174`). Dura circa un minuto.
import { readFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { inParola, inSimboli, SIMBOLO_QU } from '../src/lib/game/alfabeto.ts';
import { Dizionario } from '../src/lib/game/dawg.ts';
import { punti } from '../src/lib/game/punteggio.ts';
import { adiacenze } from '../src/lib/game/risolutore.ts';

const URL_BASE = 'http://localhost:5174';
const buf = readFileSync(new URL('../public/dizionario.bin', import.meta.url));
const diz = Dizionario.daBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch();
const errori: string[] = [];
async function nuovo(nome: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`${nome}: ${e}`));
  return p;
}

async function entra(nome: string, codice: string): Promise<Page> {
  const p = await nuovo(nome);
  await p.goto(URL_BASE);
  await p.getByRole('button', { name: 'Entra in una stanza' }).click();
  await p.getByLabel('Codice della stanza').fill(codice);
  await p.getByLabel('Il tuo nickname').fill(nome);
  await p.getByRole('button', { name: 'Chiedi di entrare' }).click();
  await giulia.getByRole('button', { name: 'Approva', exact: true }).first().click();
  await p.getByText('Sei dentro!').waitFor();
  return p;
}

/** Parole di 4 lettere componibili nella griglia ma fuori dal dizionario, con il loro percorso. */
function scartabili(griglia: number[], quante: number): { parola: string; percorso: number[] }[] {
  const vicini = adiacenze(4);
  const trovate = new Map<string, number[]>();
  const esplora = (percorso: number[]) => {
    if (trovate.size >= quante) return;
    if (percorso.length === 4) {
      const s = percorso.map((c) => griglia[c]);
      if (!s.includes(SIMBOLO_QU) && !diz.contiene(s)) trovate.set(inParola(s), [...percorso]);
      return;
    }
    for (const v of vicini[percorso.at(-1)!]) if (!percorso.includes(v)) esplora([...percorso, v]);
  };
  for (let c = 0; c < 16; c++) esplora([c]);
  return [...trovate].map(([parola, percorso]) => ({ parola, percorso }));
}

async function traccia(p: Page, { parola, percorso }: { parola: string; percorso: number[] }) {
  const caselle = p.locator('.cornice.attiva .casella');
  const centro = async (i: number) => {
    const b = (await caselle.nth(i).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const p0 = await centro(percorso[0]);
  await p.mouse.move(p0.x, p0.y);
  await p.mouse.down();
  for (const c of percorso.slice(1)) {
    const q = await centro(c);
    await p.mouse.move(q.x, q.y, { steps: 5 });
  }
  await p.mouse.up();
  await p.getByText(`${parola} non è nel dizionario`).waitFor();
}

const giulia = await nuovo('Giulia');
await giulia.goto(URL_BASE);
await giulia.getByRole('button', { name: 'Crea una stanza' }).click();
await giulia.getByLabel('Il tuo nickname').fill('Giulia');
await giulia.getByRole('button', { name: 'Crea la stanza' }).click();
await giulia.getByText('La tua stanza').waitFor();
const codice = (await giulia.locator('.titolo.display').textContent())!.trim();
const luca = await entra('Luca', codice);
const sara = await entra('Sara', codice);
log('Stanza', codice, 'con tre giocatori');

// L'host attiva il voto; gli altri lo vedono ma non possono cambiarlo.
await giulia.getByRole('button', { name: /^Parole scartate: non si votano/ }).click();
await luca.getByText('Ai voti, 2 a testa').waitFor();
if (await luca.getByRole('button', { name: /^Parole scartate/ }).isEnabled()) throw new Error('Luca può cambiare il voto');
await giulia.getByRole('button', { name: 'Inizia la partita' }).click();
for (const p of [giulia, luca, sara]) await p.locator('.cornice.attiva').waitFor({ timeout: 15000 });

const lettere = await giulia.locator('.cornice.attiva .casella').allTextContents();
const griglia = lettere.map((t) => inSimboli(t.trim())![0]);
const [w1, w2, w3, w4] = scartabili(griglia, 4);
log('Parole scartate di prova:', w1.parola, w2.parola, w3.parola, w4.parola);
for (const w of [w1, w2, w3]) await traccia(luca, w);
await traccia(giulia, w4);

// L'host interrompe la mano per non aspettare due minuti.
const x = giulia.getByRole('button', { name: /Interrompi la mano/ });
await x.focus();
await giulia.keyboard.press('Enter');
await giulia.getByRole('dialog').getByRole('button', { name: 'Interrompi' }).click();
for (const p of [giulia, luca, sara]) await p.getByRole('heading', { name: 'Parole ai voti' }).or(p.getByText('Partita interrotta')).first().waitFor({ timeout: 15000 });

// Luca ne propone due su tre: la terza non si può più proporre.
await luca.getByRole('button', { name: w1.parola, exact: true }).waitFor();
await luca.screenshot({ path: 'e2e/schermate/voto-scelta.png' });
await luca.getByRole('button', { name: w1.parola, exact: true }).click();
await luca.getByRole('button', { name: w2.parola, exact: true }).click();
await luca.getByLabel(`Sì, ${w2.parola} è valida`).or(luca.getByText(`Aspetta`).first()).first().waitFor();
if (await luca.getByRole('button', { name: w3.parola, exact: true }).count()) throw new Error('Luca può proporre una terza parola');
await giulia.getByRole('button', { name: w4.parola, exact: true }).click();
await sara.getByLabel(`Sì, ${w4.parola} è valida`).waitFor();
await sara.screenshot({ path: 'e2e/schermate/voto-da-votare.png' });
log('Proposte inviate');

// Chi le ha proposte non vota le proprie; per le altre servono tutti.
if (await luca.getByLabel(`Sì, ${w1.parola} è valida`).count()) throw new Error('Luca vota la propria parola');
await giulia.getByLabel(`Sì, ${w1.parola} è valida`).click();
await luca.getByText('Aspetta Sara').first().waitFor();
await sara.getByLabel(`Sì, ${w1.parola} è valida`).click();
await giulia.getByLabel(`Sì, ${w2.parola} è valida`).click();
await sara.getByLabel(`No, ${w2.parola} non è valida`).click();
await luca.getByLabel(`Sì, ${w4.parola} è valida`).click();
await sara.getByLabel(`Sì, ${w4.parola} è valida`).click();

const riga = (p: Page, parola: string) => p.locator('.voto li').filter({ hasText: parola });
for (const p of [giulia, luca, sara]) {
  await riga(p, w1.parola).getByText('Valida').waitFor({ timeout: 10000 });
  await riga(p, w2.parola).getByText('Scartata').waitFor({ timeout: 10000 });
  await riga(p, w4.parola).getByText('Valida').waitFor({ timeout: 10000 });
}
log('Esiti visti da tutti: ok');

// Punti: Luca non aveva parole valide, ora ha quelli della parola approvata.
await luca.getByText(`+${punti(w1.parola, 4)} in questa mano`).waitFor({ timeout: 10000 });
await giulia.getByText(`+${punti(w4.parola, 4)} in questa mano`).waitFor({ timeout: 10000 });
await luca.getByRole('tab', { name: 'Parole' }).click();
await luca.getByText('Trovata da Tu · valida col voto').waitFor();
await luca.getByRole('tab', { name: 'Classifica' }).click();
log('Punti assegnati: ok');

// Le parole approvate restano sul telefono dell'host, e solo lì.
const aggiunte = await giulia.evaluate(() => localStorage.getItem('zelius.paroleAggiunte'));
const attese = JSON.stringify([w1.parola, w4.parola].sort());
if (aggiunte !== attese) throw new Error(`Parole aggiunte dell'host: ${aggiunte}, attese ${attese}`);
if (await luca.evaluate(() => localStorage.getItem('zelius.paroleAggiunte'))) throw new Error('Parole salvate anche da Luca');
await giulia.screenshot({ path: 'e2e/schermate/voto-host.png', fullPage: true });
await sara.screenshot({ path: 'e2e/schermate/voto-giocatore.png', fullPage: true });
log('Dizionario aggiunto dell\'host: ok');

// Nella mano successiva le parole approvate valgono per tutti (se sono nella nuova griglia).
await giulia.getByRole('button', { name: 'Riparti' }).click();
await giulia.locator('.cornice.attiva').waitFor({ timeout: 15000 });
log('Ripartita: ok');

await browser.close();
if (errori.length) {
  console.error(errori.join('\n'));
  process.exit(1);
}
