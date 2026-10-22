// Prova end-to-end di una stanza con più giocatori, contro gli emulatori di Firebase.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';
import { inSimboli } from '../src/lib/game/alfabeto.ts';
import { Dizionario } from '../src/lib/game/dawg.ts';
import { trovaParole, type Soluzione } from '../src/lib/game/risolutore.ts';

const URL_BASE = 'http://localhost:5174';
const OUT = fileURLToPath(new URL('./schermate/stanza-', import.meta.url));
const buf = readFileSync(new URL('../public/dizionario.bin', import.meta.url));
const diz = Dizionario.daBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch();
const errori: string[] = [];
async function nuovo(nome: string, tema: 'dark' | 'light' = 'dark'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`${nome}: ${e}`));
  p.on('console', (m) => m.type() === 'error' && !m.text().includes('PERMISSION_DENIED') && errori.push(`${nome}: ${m.text()}`));
  return p;
}

async function soluzioniDi(p: Page): Promise<Soluzione[]> {
  const lettere = await p.locator('.cornice.attiva .casella').allTextContents();
  return trovaParole(lettere.map((t) => inSimboli(t.trim())![0]), diz, 4);
}

async function traccia(p: Page, s: Soluzione) {
  const caselle = p.locator('.cornice.attiva .casella');
  const centro = async (i: number) => {
    const b = (await caselle.nth(i).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const p0 = await centro(s.percorso[0]);
  await p.mouse.move(p0.x, p0.y);
  await p.mouse.down();
  for (const c of s.percorso.slice(1)) {
    const q = await centro(c);
    await p.mouse.move(q.x, q.y, { steps: 5 });
  }
  await p.mouse.up();
}

// 1. Giulia crea la stanza dall'app.
const giulia = await nuovo('Giulia');
await giulia.goto(URL_BASE);
await giulia.getByRole('button', { name: 'Crea una stanza' }).click();
await giulia.getByLabel('Il tuo nickname').fill('Giulia');
await giulia.getByRole('button', { name: 'Crea la stanza' }).click();
await giulia.getByText('La tua stanza').waitFor();
const codice = (await giulia.locator('.titolo.display').textContent())!.trim();
log('Stanza creata:', codice);

// 2. Marco entra dal browser con il link; Luca dall'app con il codice; un intruso prova a entrare.
const marco = await nuovo('Marco', 'light');
await marco.goto(`${URL_BASE}/s/${codice}?web=1`);
await marco.getByLabel('Il tuo nickname').fill('Marco');
await marco.getByRole('button', { name: 'Chiedi di entrare' }).click();
await marco.getByText('Hai chiesto di entrare').waitFor();

const luca = await nuovo('Luca');
await luca.goto(URL_BASE);
await luca.getByRole('button', { name: 'Entra in una stanza' }).click();
await luca.getByLabel('Codice della stanza').fill(codice.toLowerCase());
await luca.getByLabel('Il tuo nickname').fill('Luca');
await luca.getByRole('button', { name: 'Chiedi di entrare' }).click();

const intruso = await nuovo('Intruso');
await intruso.goto(`${URL_BASE}/s/${codice}?web=1`);
await intruso.getByLabel('Il tuo nickname').fill('Intruso');
await intruso.getByRole('button', { name: 'Chiedi di entrare' }).click();

await giulia.getByRole('button', { name: 'Blocca Intruso' }).waitFor();
await giulia.screenshot({ path: OUT + '1-host-richieste.png' });
await marco.screenshot({ path: OUT + '2-web-attesa.png' });
await giulia.getByRole('button', { name: 'Blocca Intruso' }).click();
await intruso.getByText('Accesso bloccato').waitFor();
log('Intruso bloccato: ok');
await giulia.getByRole('button', { name: 'Approva tutti' }).click();
await marco.getByText('Sei dentro!').waitFor();
await luca.getByText('Sei dentro!').waitFor();
log('Marco e Luca approvati: ok');

// L'intruso non può riprovare.
await intruso.reload();
await intruso.getByLabel('Il tuo nickname').fill('Intruso2');
await intruso.getByRole('button', { name: 'Chiedi di entrare' }).click();
await intruso.getByText('Accesso bloccato').waitFor();
log('Intruso bloccato anche dopo aver ricaricato: ok');

// 3. Durata 1 minuto, poi si parte.
await giulia.getByRole('button', { name: /Durata 2 minuti/ }).click();
await giulia.getByRole('button', { name: /Durata 3 minuti/ }).click();
await marco.getByRole('button', { name: /Durata 1 minuti/ }).waitFor();
log('Impostazioni viste anche da Marco: ok');
await giulia.screenshot({ path: OUT + '3-host-lobby.png' });
await giulia.getByRole('button', { name: 'Inizia la partita' }).click();
await luca.getByText('Si comincia tra').waitFor();
for (const p of [giulia, marco, luca]) await p.locator('.cornice.attiva').waitFor({ timeout: 15000 });
log('Mano 1 iniziata per tutti');

const sol = await soluzioniDi(giulia);
const solMarco = await soluzioniDi(marco);
if (sol.map((s) => s.parola).join() !== solMarco.map((s) => s.parola).join()) throw new Error('Griglie diverse!');
log('Stessa griglia per tutti,', sol.length, 'parole possibili');
await traccia(giulia, sol[0]);
await traccia(giulia, sol[1]);
await traccia(marco, sol[1]);
await traccia(marco, sol[2]);
await traccia(luca, sol[3]);
await marco.getByRole('button', { name: 'Usa la tastiera' }).click();
await marco.getByLabel('Parola').fill('xyzw');
await marco.getByLabel('Parola').press('Enter');
log('Messaggio a Marco:', await marco.locator('.messaggio').textContent());
await marco.screenshot({ path: OUT + '4-web-gioco.png' });

// 4. Fine mano e risultati.
await giulia.getByText('Fine mano 1').waitFor({ timeout: 90000 });
for (const p of [giulia, marco, luca]) await p.locator('.classifica li').first().waitFor({ timeout: 20000 });
const classifica = await giulia.locator('.classifica li').allInnerTexts();
log('Classifica:', classifica.map((r) => r.replace(/\s+/g, ' ')).join(' | '));
const attesi = { Giulia: sol[0].punti + sol[1].punti, Marco: sol[1].punti + sol[2].punti, Luca: sol[3].punti };
log('Punti attesi:', JSON.stringify(attesi));
await giulia.screenshot({ path: OUT + '5-host-classifica.png' });
await marco.getByRole('tab', { name: 'Parole' }).click();
await marco.locator('.voce').first().waitFor();
const prime = await marco.locator('.voce').allInnerTexts();
log('Parole viste da Marco:', prime.slice(0, 4).map((r) => r.replace(/\s+/g, ' ')).join(' | '));
await marco.screenshot({ path: OUT + '6-web-parole.png' });

// 5. Giulia (host) se ne va: Luca deve diventare host e la partita continua.
await giulia.context().close();
log('Giulia è uscita');
await luca.getByRole('button', { name: 'Chiudi la stanza per tutti' }).waitFor({ timeout: 30000 });
log('Luca è il nuovo host: ok');
for (const p of [marco, luca]) await p.locator('.cornice.attiva').waitFor({ timeout: 70000 });
log('Mano 2 iniziata');
const sol2 = await soluzioniDi(luca);
await traccia(luca, sol2[0]);
await traccia(marco, sol2[0]);
await luca.getByText('Fine mano 2').waitFor({ timeout: 90000 });
await luca.locator('.classifica li').first().waitFor({ timeout: 20000 });
log('Classifica mano 2 (calcolata da Luca):', (await luca.locator('.classifica li').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ')).join(' | '));
await luca.screenshot({ path: OUT + '7-nuovo-host.png' });

console.log('Errori nelle pagine:', errori.length ? errori : 'nessuno');
await browser.close();
