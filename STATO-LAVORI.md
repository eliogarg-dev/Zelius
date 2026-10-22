# Stato dei lavori

Ultimo aggiornamento: 2026-10-23.

**Per riprendere con Claude:** apri la cartella del progetto in Claude Code e scrivi:
"Leggi STATO-LAVORI.md, paroliere-design.md e brainstorming-paroliere.md e continuiamo l'implementazione."

## Tappe (dal design, §10)

| # | Tappa | Stato |
|---|---|---|
| 1 | Dizionario e ricerca delle parole | ✅ Fatta |
| 2 | Allenamento da soli | ✅ Fatta |
| 3 | Stanze su Firebase | ✅ Fatta e collaudata con gli emulatori (manca il progetto Firebase vero) |
| 4 | Versione browser | 🟡 In gran parte fatta (stessa app con `?web=1` / link `/s/CODICE`); manca la pubblicazione su Firebase Hosting |
| 5 | App Android con Capacitor + rifiniture | ⏳ Da fare |

## Cosa c'è

- **Dizionario** (`public/dizionario.bin`, 236 KB): 380.641 parole da Morph-it!, senza nomi propri e senza forme verbali con pronomi attaccati, accenti tolti, più ZAPP. Solo Morph-it per ora (Hunspell è GPL: rimandato).
- **Logica di gioco** (`src/lib/game/`): alfabeto con Qu come simbolo unico (vale 2 lettere), DAWG, risolutore, punteggio (ZAPP = 10 in totale), griglie con al massimo 3 (4x4) o 4 (5x5) lettere uguali e al massimo un Qu.
- **Interfaccia** (`src/screens/`, `src/components/`): stile moderno dei mockup, tema automatico/chiaro/scuro, griglia da trascinare con traccia, tastiera alternativa, effetto ZAPP.
- **Stanze** (`src/lib/stanza/`): creazione con codice di 4 caratteri, QR code e link, richieste approva/rifiuta/blocca, impostazioni, mani a oltranza con pausa di 45 s, parole controllate con elenco cifrato, risultati con tab Classifica/Parole, presenza online, passaggio dell'host al primo giocatore con l'app quando l'host esce.
- **Regole di sicurezza** (`database.rules.json`) con 19 test sull'emulatore.

## Scelte prese durante l'implementazione (non nel design)

- Elenco cifrato con un'impronta non crittografica (cyrb53 + sale): funziona anche su pagine non https, utile per provare in rete locale. Il design parlava di SHA-256: la protezione è comunque solo contro l'imbroglio occasionale.
- Il nuovo host subentra appena non c'è una mano in corso (anche durante la pausa), non solo a mano finita.
- Chi esce resta in classifica (con +0 nelle mani successive).
- La griglia di fine mano mostra il percorso della parola toccata.

## Prossimi passi

1. **Progetto Firebase vero** (serve l'account Google dell'utente): creare il progetto, attivare Authentication anonima e Realtime Database, creare `.env.production` con le chiavi (vedi `src/vite-env.d.ts`), pubblicare regole e hosting (`node scripts/firebase.mjs deploy`).
2. **App Android con Capacitor**: aggiungere Capacitor, scanner QR per "Entra", condivisione nativa, icona e splash. L'SDK Android è già sul PC di sviluppo originale (`%LOCALAPPDATA%\Android\Sdk`).
3. Rifiniture: tempo di gioco per i giocatori in attesa, schermata "Vedi tutti" dei giocatori, prova su telefoni veri.

## Preparare un altro PC

1. Installare **Node.js 24 LTS** e **git**.
2. Per emulatori Firebase e Android serve **Java 21**: sul primo PC è un JDK portatile in `%LOCALAPPDATA%\Programs\jdk-21…` (scaricato da adoptium.net). `scripts/firebase.mjs` lo trova da solo, oppure si imposta `ZAPP_JAVA_HOME`.
3. `npm install`, poi `npx playwright install chromium` per le prove automatiche.
4. Il dizionario è già nel repository: non serve rigenerarlo.

## Comandi utili

| Comando | A cosa serve |
|---|---|
| `npm run dev` | Gioco in locale (allenamento), http://localhost:5173 |
| `npm run emulatori` | Emulatori Firebase (database, autenticazione, interfaccia su http://localhost:4000) |
| `npm run dev:emulatore` | Gioco collegato agli emulatori, anche da telefoni in rete locale |
| `npm test` | Test della logica (32) |
| `npm run test:regole` | Test delle regole di sicurezza sull'emulatore (19) |
| `npm run check` | Controllo dei tipi |
| `node e2e/prova-allenamento.ts` | Prova completa dell'allenamento (con `npm run dev` su porta 5173) |
| `node e2e/prova-stanza.ts` | Prova completa di una stanza con 4 giocatori e cambio di host (con emulatori e `npx vite --mode emulatore --port 5174`); dura circa 3 minuti |
