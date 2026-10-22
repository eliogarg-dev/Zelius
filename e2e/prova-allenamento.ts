// Prova end-to-end dell'allenamento: gioca una mano trascinando sulle lettere e scrivendo con la tastiera.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { inSimboli } from '../src/lib/game/alfabeto.ts';
import { Dizionario } from '../src/lib/game/dawg.ts';
import { trovaParole } from '../src/lib/game/risolutore.ts';

const OUT = fileURLToPath(new URL('./schermate/', import.meta.url));
const buf = readFileSync(new URL('../public/dizionario.bin', import.meta.url));
const diz = Dizionario.daBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const errori: string[] = [];
page.on('pageerror', (e) => errori.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errori.push(m.text()));

await page.goto('http://localhost:5173/');
await page.screenshot({ path: OUT + '1-home.png' });
await page.getByRole('button', { name: 'Allenati da solo' }).click();
await page.getByRole('button', { name: '5×5' }).click();
await page.getByRole('button', { name: 'Inizia' }).click();
await page.locator('.casella').first().waitFor();

const lettere = await page.locator('.casella').allTextContents();
const griglia = lettere.map((t) => inSimboli(t.trim())![0]);
const soluzioni = trovaParole(griglia, diz, 4);
console.log('Griglia:', lettere.map((t) => t.trim()).join(' '), '| soluzioni:', soluzioni.length);

// Trascina il mouse lungo il percorso delle prime tre parole.
const caselle = page.locator('.casella');
async function centro(i: number) {
  const b = (await caselle.nth(i).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
for (const s of soluzioni.slice(0, 3)) {
  const p0 = await centro(s.percorso[0]);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  for (const c of s.percorso.slice(1)) {
    const p = await centro(c);
    await page.mouse.move(p.x, p.y, { steps: 6 });
  }
  if (s === soluzioni[2]) await page.screenshot({ path: OUT + '2-trascino.png' });
  await page.mouse.up();
}

// Una parola con la tastiera, una ripetuta e una inventata.
await page.getByRole('button', { name: 'Usa la tastiera' }).click();
const campo = page.getByLabel('Parola');
const ultima = soluzioni[soluzioni.length - 1].parola;
await campo.fill(ultima.toLowerCase());
await campo.press('Enter');
await campo.fill(soluzioni[0].parola);
await campo.press('Enter');
const giaTrovata = await page.locator('.messaggio').textContent();
await campo.fill('zzzz');
await campo.press('Enter');
const inventata = await page.locator('.messaggio').textContent();
const chip = await page.locator('.chip').allTextContents();
const punti = await page.locator('.punteggio strong').textContent();
console.log('Parole trovate:', chip.join(', '), '| punti:', punti);
console.log('Messaggi:', giaTrovata, '|', inventata);
await page.screenshot({ path: OUT + '3-gioco.png' });

await page.getByRole('button', { name: 'Esci' }).click();
await page.getByText('Fine mano').waitFor(); await page.mouse.wheel(0, 500); await page.waitForTimeout(300);
await page.locator('.voce').nth(1).click();
await page.screenshot({ path: OUT + '4-risultati.png' });
console.log('Riepilogo:', (await page.locator('.riepilogo').innerText()).replace(/\s+/g, ' '));

// Tema chiaro dalle impostazioni.
await page.getByRole('button', { name: 'Torna alla home' }).click();
await page.getByRole('button', { name: 'Impostazioni' }).click();
await page.getByRole('button', { name: 'Chiaro' }).click();
await page.screenshot({ path: OUT + '5-impostazioni-chiaro.png' });
console.log('Tema:', await page.evaluate(() => document.documentElement.dataset.theme));

console.log('Errori nella pagina:', errori.length ? errori : 'nessuno');
await browser.close();
