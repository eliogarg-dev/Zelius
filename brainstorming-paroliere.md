# Paroliere — note di brainstorming (in corso)

Ultimo aggiornamento: 2026-10-22. Nessun codice scritto: siamo ancora nella fase di definizione.

**Per riprendere con Claude:** apri la cartella `Zapp` in Claude Code e scrivi:
"Leggi brainstorming-paroliere.md e paroliere-design.md e continuiamo da dove eravamo rimasti."

---

## L'idea

Una versione del gioco del Paroliere (Boggle italiano), uguale a https://www.ilgiocodelparoliere.it/ nella dinamica di gioco.
Pensata soprattutto per **persone nella stessa stanza**; giocare **a distanza** è un "meglio se si riesce".
Si crea una stanza privata, si condivide link o QR code, gli altri entrano. Chi crea la stanza **approva, rifiuta o blocca** gli accessi.

## Deciso dall'utente

- **Solo il gioco classico.** Niente modalità Quiz, Enciclopedica, Fantasiosa, votazioni.
- **Due modi di giocare:**
  - **App Android**: per allenarsi da soli e per creare stanze. Chi ha l'app la usa anche per entrare nelle stanze altrui.
  - **Browser**: chi non ha l'app si collega a quella di chi ha creato la stanza (QR/link), senza installare nulla.
- **Stessa parola trovata da più giocatori:** come il sito nelle stanze standard → **punti pieni a tutti**.
- **Dizionario:** lista libera trovata in rete/GitHub (vedi sotto).
- **Ogni giocatore gioca dal proprio telefono**, tutti in contemporanea sulla stessa griglia. Il telefono dell'host NON fa da server/tavolo centrale.
- **Servizio online: Firebase**, partendo da zero.
- **"Qu" è una casella unica** (una sola casella con "Qu").
- **Se l'host esce a metà partita:** in locale la partita termina; online "forse" gli altri possono continuare (da definire).
- **Numero massimo di giocatori:** nessun limite, o comunque alto.
- **Firebase sempre**, anche per chi è nella stessa stanza (serve internet, va bene la rete dati). Niente modalità Wi‑Fi locale.
- Chi non ha l'app gioca dal **browser**, con una pagina ospitata su Firebase Hosting (funziona anche su iPhone). Dal browser si entra nelle stanze; creare stanze e allenarsi da soli restano funzioni dell'app.
- **"Qu" conta 2 lettere** per lunghezza minima e punteggio.
- **Online, se l'host esce:** la mano in corso arriva alla fine, poi la stanza passa a un altro giocatore, che diventa host.

## Proposta tecnica di Claude (da confermare nel design)

- Il dizionario sta solo nell'app (troppo pesante per il browser). A inizio mano l'app dell'host trova tutte le parole valide della griglia e le carica su Firebase **in forma cifrata (hash)**: ogni telefono verifica le proprie parole, ma nessuno può leggere la lista per barare. A fine mano la lista viene mostrata in chiaro.
- Niente Cloud Functions, per restare nel **piano gratuito** di Firebase.

## Ipotesi di Claude (non contestate, da confermare)

- Niente account/registrazione: si sceglie solo un nickname entrando.
- Niente classifica ELO, niente chat.
- Chiunque abbia l'app può creare una stanza.
- Chi crea la stanza sceglie: griglia 4x4 o 5x5, durata della mano, lunghezza minima delle parole.
- Il dizionario è dentro l'app, quindi funziona offline.

## Domanda aperta (era la prossima)

**Tutto confermato (2026-10-22):**
- le ipotesi di Claude elencate sopra;
- si gioca **a oltranza**: nessun numero fisso di mani, finché l'host non chiude la stanza;
- se l'host esce vale sempre la regola online: la mano in corso finisce, poi la stanza passa a un altro giocatore.

Brainstorming chiuso. Documento di design: `paroliere-design.md`.

## Parola speciale ZAPP (deciso)

- ZAPP è aggiunta al dizionario come parola speciale (non è una parola italiana).
- Chi la trova riceve **10 punti in totale** (al posto dell'1 punto normale di una parola di 4 lettere), con un effetto grafico.
- Il bonus va a **tutti quelli che la trovano**, come per le altre parole.
- La griglia resta casuale: ZAPP **non** viene inserita apposta.

## Aspetto delle schermate (deciso)

Mockup: https://claude.ai/artifact/PzWH2Si4u2xYKyoAkfq9cn
- **Stile moderno**, con la possibilità di scegliere il **tema chiaro** (proposta: Automatico come il telefono / Chiaro / Scuro).
- **Stanza dell'host:** in ordine codice della stanza, **QR code e link**, poi **griglia, durata e minimo di lettere**, poi le richieste di accesso e i giocatori. Le liste reggono **tanti giocatori** (lista scorrevole, "Approva tutti", "Vedi tutti").
- **Fine mano:** **Classifica** e **Parole** su **due tab separati**. Le parole si filtrano (Tutte / Le mie / Non trovate) e per ognuna si mostra "Trovata da X, Y e altri N".

## Prossimi passi

1. Chiudere le domande aperte.
2. Claude scrive il documento di design completo (`docs/…-design.md`), revisionato da un secondo agente.
3. Approvazione dell'utente → piano di implementazione → codice.

---

## Analisi del sito ilgiocodelparoliere.it (riferimento)

### Regole
- Griglia 4x4 o 5x5, alfabeto italiano a 21 lettere (niente j, k, x, y, w), frequenze delle lettere calibrate sull'italiano.
- Si parte da qualsiasi casella; la lettera successiva deve essere adiacente (sopra/sotto, destra/sinistra, diagonale); una casella non si può usare due volte (lettere uguali in caselle diverse sì).
- Accettate tutte le flessioni (maschile/femminile, singolare/plurale, tutte le coniugazioni). **Escluse**: verbi con particelle pronominali (es. "andandosene") e nomi propri.
- Mano da **2 minuti** (max 3), poi **45 secondi** di pausa.
- Lunghezza minima per stanza: 4 lettere (stanze ospiti), 5 (4x4 registrati), 6 (5x5 registrati). Parole più corte non accettate.
- **Nessuna penalità** per parole errate o non presenti in griglia.

### Punteggio
| Lettere | Punti |
|---|---|
| 4 | 1 |
| 5 | 2 |
| 6 | 3 |
| 7 | 5 |
| 8 | 8 |
| 9+ | +2 per lettera (9→10, 10→12, 11→14 …) |
| 16 o più | 24 (massimo) |

### Meccanica
- A inizio mano il programma trova **tutte** le parole valide della griglia confrontandole col dizionario; ogni parola proposta viene poi cercata in quell'elenco.
- A fine mano ognuno vede: classifica, parole trovate da tutti con i punti, **tutte le parole trovate dal computer** e il punteggio massimo possibile.
- Inserimento: tastiera sotto la griglia, oppure mouse/touch trascinando sulla griglia. Lenti per ingrandire/rimpicciolire la griglia. Ottimizzato per smartphone.
- Pulsante rosso "Segnala parole mancanti" (manda una mail ai gestori).
- Stanze private: ottenute scrivendo al moderatore, che manda un link segreto (la nostra idea con QR + approvazione dell'host è migliore).

### Dizionario del sito
Zingarelli acquistato + tutte le flessioni, quasi un milione di forme. **Non riutilizzabile** (proprietario).

### Dizionari liberi individuati
- **Morph-it!** (Università di Bologna): lessico morfologico con forme flesse, licenza CC BY-SA / LGPL. Versione 0.11 (2004): ~569.000 forme; le versioni recenti sono più ricche. Esiste un pacchetto npm basato su di esso: `italian-words-dict`.
  - https://godzilla.sslmit.unibo.it/~eros/downloads/Morph-it.pdf
  - https://www.aclweb.org/aclwiki/Resources_for_Italian
  - https://npmjs.com/package/italian-words-dict
- **Hunspell it_IT** (correttore di LibreOffice), GPL: espandendo gli affissi si ottengono tutte le forme.
- Idea: unire le due liste e togliere le parole con j, k, x, y, w.
