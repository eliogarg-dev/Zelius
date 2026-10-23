# Stato dei lavori

Ultimo aggiornamento: 2026-10-23.

**Per riprendere con Claude:** apri la cartella del progetto in Claude Code e scrivi:
"Leggi STATO-LAVORI.md, paroliere-design.md e brainstorming-paroliere.md e continuiamo l'implementazione."

## Tappe (dal design, §10)

| # | Tappa | Stato |
|---|---|---|
| 1 | Dizionario e ricerca delle parole | ✅ Fatta |
| 2 | Allenamento da soli | ✅ Fatta |
| 3 | Stanze su Firebase | ✅ Fatta, collaudata con gli emulatori e sul progetto vero `zelius-34580` |
| 4 | Versione browser | ✅ Online su https://zelius.web.app (link delle stanze `/s/CODICE`) |
| 5 | App Android con Capacitor + rifiniture | 🟡 App fatta e provata su un Galaxy A72 (Android 14) con gli emulatori: allenamento, creazione stanza, condivisione, scanner QR, tasto Indietro. Mancano le rifiniture |

## Cosa c'è

- **Dizionario** (`public/dizionario.bin`, 236 KB): 380.641 parole da Morph-it!, senza nomi propri e senza forme verbali con pronomi attaccati, accenti tolti, più ZELIUS. Solo Morph-it per ora (Hunspell è GPL: rimandato).
- **Logica di gioco** (`src/lib/game/`): alfabeto con Qu come simbolo unico (vale 2 lettere), DAWG, risolutore, punteggio (ZELIUS = 10 in totale), griglie con al massimo 3 (4x4) o 4 (5x5) lettere uguali e al massimo un Qu.
- **Interfaccia** (`src/screens/`, `src/components/`): stile moderno dei mockup, tema automatico/chiaro/scuro, griglia da trascinare con traccia, tastiera alternativa, effetto ZELIUS.
- **Stanze** (`src/lib/stanza/`): creazione con codice di 4 caratteri, QR code e link, richieste approva/rifiuta/blocca, impostazioni, mani a oltranza con pausa di 45 s, parole controllate con elenco cifrato, risultati con tab Classifica/Parole, presenza online, passaggio dell'host al primo giocatore con l'app quando l'host esce.
- **Regole di sicurezza** (`database.rules.json`) con 19 test sull'emulatore.
- **App Android** (`android/`, `capacitor.config.json`, id `dev.eliogarg.zelius`): Capacitor 8, minSdk 26. Scanner QR in "Entra" (`@capacitor/barcode-scanner`, il codice si legge anche dal link), condivisione nativa (`@capacitor/share`: nella WebView `navigator.share` non c'è), tasto Indietro (dalla home chiude l'app, nella stanza non fa nulla, altrove torna alla home). Icona e splash generati da `assets/*.png` con `npx @capacitor/assets generate --android`.

## Firebase

- Progetto **zelius-34580** (account elio.softlab@gmail.com, piano gratuito Spark). Console: https://console.firebase.google.com/project/zelius-34580/overview
- Realtime Database `zelius-34580-default-rtdb` in **europe-west1**; accesso anonimo attivo; sito **zelius** → https://zelius.web.app
- Chiavi in `.env.production` (pubbliche per natura, nel repository): `npm run build` e `npm run android` le usano da sole.
- Pubblicare: `npm run build`, poi `npx firebase deploy --only database,auth,hosting` (regole, accesso anonimo e sito; `firebase.json` contiene tutto). Serve `npx firebase login` con l'account sopra.
- Il database predefinito è stato creato con l'API di firebase-tools (`createInstance`), perché `firebase init database` è solo interattivo.

## Scelte prese durante l'implementazione (non nel design)

- Elenco cifrato con un'impronta non crittografica (cyrb53 + sale): funziona anche su pagine non https, utile per provare in rete locale. Il design parlava di SHA-256: la protezione è comunque solo contro l'imbroglio occasionale.
- Il nuovo host subentra appena non c'è una mano in corso (anche durante la pausa), non solo a mano finita.
- Chi esce resta in classifica (con +0 nelle mani successive).
- La griglia di fine mano mostra il percorso della parola toccata.

## Prossimi passi

1. Provare una partita con più persone vere (telefoni con l'app e browser).
2. Pubblicare l'app: APK firmato o Play Store (serve una chiave di firma; l'APK di debug va bene solo per le prove).
3. Facoltativo: aprire i link `/s/CODICE` direttamente nell'app (App Links: serve `assetlinks.json` sull'hosting).
4. Rifiniture fatte: finestre di conferma in italiano (`src/lib/conferma.ts` con `<dialog>`, al posto di `confirm()` che nell'app mostra CANCEL/OK). Già presenti nel codice: tempo che manca per chi entra a mano iniziata, "Vedi tutti" nei giocatori.
## Preparare un altro PC

1. Installare **Node.js 24 LTS** e **git**.
2. Per emulatori Firebase e Android serve **Java 21**: sul primo PC è un JDK portatile in `%LOCALAPPDATA%\Programs\jdk-21…` (scaricato da adoptium.net). `scripts/firebase.mjs` lo trova da solo, oppure si imposta `ZELIUS_JAVA_HOME`.
3. `npm install`, poi `npx playwright install chromium` per le prove automatiche.
4. Il dizionario è già nel repository: non serve rigenerarlo.
5. Per l'app Android: Android Studio (contiene già un Java 21 in `C:\Program Files\Android\Android Studio\jbr`) con l'SDK in `%LOCALAPPDATA%\Android\Sdk`.

## Comandi utili

| Comando | A cosa serve |
|---|---|
| `npm run dev` | Gioco in locale (allenamento), http://localhost:5173 |
| `npm run emulatori` | Emulatori Firebase (database, autenticazione, interfaccia su http://localhost:4000) |
| `npm run dev:emulatore` | Gioco collegato agli emulatori, anche da telefoni in rete locale |
| `npm run android` | Compila il sito e lo copia nel progetto Android |
| `cd android; .\gradlew assembleDebug` | Crea l'APK di prova in `android/app/build/outputs/apk/debug/` (con `JAVA_HOME` sul Java di Android Studio); in alternativa `npx cap open android` e si compila da Android Studio |
| App sul telefono con gli emulatori | `npm run emulatori`; `adb reverse tcp:9000 tcp:9000` e `adb reverse tcp:9099 tcp:9099`; compilare con `VITE_HOST_EMULATORE=127.0.0.1 npx vite build --mode emulatore`, poi `npx cap sync android` e `assembleDebug`. Solo la build di debug permette l'http verso 127.0.0.1 (`android/app/src/debug/`). Nella prova del 23/10 era attivo anche `"allowMixedContent": true` in `android/app/src/main/assets/capacitor.config.json` (file generato, si azzera a ogni sync): non verificato se serve |
| `npm test` | Test della logica (32) |
| `npm run test:regole` | Test delle regole di sicurezza sull'emulatore (19) |
| `npm run check` | Controllo dei tipi |
| `node e2e/prova-allenamento.ts` | Prova completa dell'allenamento (con `npm run dev` su porta 5173) |
| `node e2e/prova-stanza.ts` | Prova completa di una stanza con 4 giocatori e cambio di host (con emulatori e `npx vite --mode emulatore --port 5174`); dura circa 3 minuti |
