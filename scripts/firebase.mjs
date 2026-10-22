// Esegue la CLI di Firebase con un Java 21, richiesto dagli emulatori.
// Usa ZAPP_JAVA_HOME se impostata, altrimenti cerca un JDK 21 in %LOCALAPPDATA%\Programs.
// Uso: node scripts/firebase.mjs <argomenti della CLI di firebase>

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function trovaJava() {
  if (process.env.ZAPP_JAVA_HOME) return process.env.ZAPP_JAVA_HOME;
  const cartella = join(process.env.LOCALAPPDATA ?? '', 'Programs');
  if (!existsSync(cartella)) return null;
  const jdk = readdirSync(cartella).find((n) => /^jdk-2[1-9]/.test(n));
  return jdk ? join(cartella, jdk) : null;
}

const env = { ...process.env };
const java = trovaJava();
if (java) {
  env.JAVA_HOME = java;
  env.PATH = `${join(java, 'bin')}${process.platform === 'win32' ? ';' : ':'}${env.PATH}`;
}

// Con shell: true gli argomenti vengono uniti in una riga: quelli con spazi vanno tra virgolette.
const argomenti = process.argv.slice(2).map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
const figlio = spawn('npx', ['firebase', ...argomenti], { env, stdio: 'inherit', shell: true });
figlio.on('exit', (codice) => process.exit(codice ?? 1));
