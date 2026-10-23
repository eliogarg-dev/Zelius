// Prova dell'interruzione di una mano da parte dell'host, contro gli emulatori di Firebase
// (con `npx vite --mode emulatore --port 5174`).
import { chromium, type Page } from 'playwright';

const URL_BASE = 'http://localhost:5174';
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch();
const errori: string[] = [];
async function nuovo(nome: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errori.push(`${nome}: ${e}`));
  return p;
}

const giulia = await nuovo('Giulia');
await giulia.goto(URL_BASE);
await giulia.getByRole('button', { name: 'Crea una stanza' }).click();
await giulia.getByLabel('Il tuo nickname').fill('Giulia');
await giulia.getByRole('button', { name: 'Crea la stanza' }).click();
await giulia.getByText('La tua stanza').waitFor();
const codice = (await giulia.locator('.titolo.display').textContent())!.trim();

const luca = await nuovo('Luca');
await luca.goto(URL_BASE);
await luca.getByRole('button', { name: 'Entra in una stanza' }).click();
await luca.getByLabel('Codice della stanza').fill(codice);
await luca.getByLabel('Il tuo nickname').fill('Luca');
await luca.getByRole('button', { name: 'Chiedi di entrare' }).click();
await giulia.getByRole('button', { name: 'Approva', exact: true }).click();
await luca.getByText('Sei dentro!').waitFor();

await giulia.getByRole('button', { name: 'Inizia la partita' }).click();
for (const p of [giulia, luca]) await p.locator('.cornice.attiva').waitFor({ timeout: 15000 });
if (await luca.getByRole('button', { name: /Interrompi la mano/ }).count()) throw new Error('Luca non è host ma vede la X');

// Una pressione breve non fa nulla.
const x = giulia.getByRole('button', { name: /Interrompi la mano/ });
const b = (await x.boundingBox())!;
await giulia.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await giulia.mouse.down();
await giulia.waitForTimeout(800);
await giulia.mouse.up();
await giulia.waitForTimeout(1500);
if (await giulia.getByRole('dialog').count()) throw new Error('Conferma apparsa dopo una pressione breve');

// Tenuta per 2 secondi: chiede conferma.
await giulia.mouse.down();
await giulia.getByRole('dialog').waitFor({ timeout: 3000 });
await giulia.mouse.up();
await giulia.getByRole('dialog').getByRole('button', { name: 'Interrompi' }).click();
log('Mano interrotta');

await giulia.getByText('Partita interrotta').waitFor({ timeout: 10000 });
await luca.getByText('Interrotta da Giulia: aspetta che Giulia riparta').waitFor({ timeout: 10000 });
await giulia.getByRole('button', { name: 'Riparti' }).waitFor({ timeout: 10000 });
await giulia.screenshot({ path: 'e2e/schermate/interruzione-host.png' });
await luca.screenshot({ path: 'e2e/schermate/interruzione-giocatore.png' });
log('Avviso a tutti: ok');

// L'host esce: Luca subentra e il gioco resta fermo finché non riparte lui.
await giulia.context().close();
await luca.getByRole('button', { name: 'Riparti' }).waitFor({ timeout: 30000 });
await luca.waitForTimeout(3000);
if (await luca.locator('.cornice.attiva').count()) throw new Error('La mano è ripartita da sola');
log('Luca nuovo host, gioco fermo: ok');

await luca.getByRole('button', { name: 'Riparti' }).click();
await luca.locator('.cornice.attiva').waitFor({ timeout: 15000 });
await luca.getByText('Mano 2').waitFor();
log('Ripartita con la mano 2: ok');

await browser.close();
if (errori.length) {
  console.error(errori.join('\n'));
  process.exit(1);
}
