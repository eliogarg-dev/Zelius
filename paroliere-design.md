# Paroliere — documento di design

Versione 1 · 2026-10-22 · da approvare
Nasce da [brainstorming-paroliere.md](brainstorming-paroliere.md). Mockup delle schermate: https://claude.ai/artifact/PzWH2Si4u2xYKyoAkfq9cn

Le voci segnate **(proposta)** non sono state discusse nel brainstorming: sono scelte di Claude, da confermare o cambiare in fase di revisione.

---

## 1. Obiettivo

Una versione del Paroliere (Boggle italiano) con le stesse regole di gioco di https://www.ilgiocodelparoliere.it/, pensata per giocare tra amici, soprattutto nella stessa stanza ma anche a distanza.

- Chi ha l'**app Android** può allenarsi da solo, creare stanze ed entrare in quelle altrui.
- Chi non ha l'app entra dal **browser** (anche iPhone), con un link o un QR code, senza installare nulla.
- Ognuno gioca **dal proprio telefono**, tutti in contemporanea sulla stessa griglia.

### Fuori dallo scopo
- Modalità diverse dal gioco classico (Quiz, Enciclopedica, Fantasiosa, votazioni).
- Account e registrazione, chat, classifica ELO o storico tra partite diverse.
- Gioco senza internet nelle stanze (l'allenamento da soli invece funziona offline).
- App per iPhone (chi ha un iPhone gioca dal browser).

---

## 2. Regole di gioco

### Griglia
- **4x4 o 5x5**, scelta dall'host.
- Alfabeto italiano a **21 lettere**: niente J, K, X, Y, W.
- La Q compare solo come casella unica **"Qu"**, che conta **2 lettere** per la lunghezza e per i punti.
- Le lettere si estraggono con frequenze calibrate sull'italiano. **(proposta)** Le frequenze si ricavano dal dizionario stesso, contando quanto spesso compare ogni lettera.
- **(proposta)** Se una griglia ha troppe poche parole (meno di 30 in 4x4 e di 60 in 5x5), se ne genera un'altra.

### Parole valide
- Si parte da qualsiasi casella. Ogni lettera successiva deve essere adiacente alla precedente, anche in diagonale, e la stessa casella non si può usare due volte.
- Valgono tutte le forme flesse: maschile e femminile, singolare e plurale, tutte le coniugazioni.
- **Non valgono** i nomi propri e i verbi con particelle pronominali attaccate (es. "andandosene").
- Lunghezza minima scelta dall'host: **4, 5 o 6 lettere**.
- **(proposta)** Gli accenti si ignorano: "città" si scrive CITTA.
- **Nessuna penalità** per parole sbagliate o non presenti nella griglia.
- Se più giocatori trovano la stessa parola, **prendono tutti i punti pieni**.

### Punteggio

| Lettere | Punti |
|---|---|
| 4 | 1 |
| 5 | 2 |
| 6 | 3 |
| 7 | 5 |
| 8 | 8 |
| 9 o più | 2 punti in più per ogni lettera (9→10, 10→12, 11→14 …) |
| 16 o più | 24 (massimo) |

**Parola speciale ZAPP:** vale **10 punti in totale** e mostra un effetto grafico a chi la trova. Il bonus va a tutti quelli che la trovano. La griglia resta casuale: ZAPP non viene mai inserita apposta.

### Tempi
- Durata della mano scelta dall'host: **1, 2 o 3 minuti** (predefinita 2).
- Tra una mano e l'altra c'è una **pausa di 45 secondi** con i risultati.
- Si gioca **a oltranza**: le mani si susseguono finché l'host non chiude la stanza.

---

## 3. Come si gioca (flussi)

### 3.1 Allenamento da soli (solo app)
1. Dalla home si sceglie "Allenati" e si impostano griglia, durata e lunghezza minima.
2. Si gioca una mano. Alla fine si vedono le parole trovate, tutte le parole possibili e il punteggio massimo.
3. Funziona **senza internet**, perché dizionario e ricerca delle parole sono dentro l'app.

### 3.2 Creare una stanza (solo app)
1. Dalla home si sceglie "Crea stanza". L'app crea la stanza e mostra il codice (es. K74Q), il QR code e il link da condividere.
2. L'host imposta griglia, durata e lunghezza minima. Potrà cambiarle anche più avanti, con effetto dalla mano successiva.
3. Le richieste di accesso arrivano in una lista. Per ognuna l'host sceglie:
   - **Approva**: il giocatore entra;
   - **Rifiuta**: il giocatore non entra, ma può chiedere di nuovo;
   - **Blocca**: il giocatore non può più chiedere di entrare in questa stanza.

   C'è anche "Approva tutti".
4. Con "Inizia la partita" parte la prima mano. Dopo, le mani si susseguono da sole, con la pausa di 45 secondi.
5. Con "Chiudi stanza" la partita finisce per tutti.

### 3.3 Entrare in una stanza
- **Dal browser:** si inquadra il QR o si apre il link e si inserisce un nickname. Poi si attende l'approvazione dell'host.
- **Dall'app:** "Entra" permette di inquadrare il QR o di scrivere il codice. Il resto è uguale.
- **(proposta)** Chi entra mentre una mano è in corso aspetta la mano successiva e intanto vede il tempo che manca.
- Se un giocatore perde la connessione e rientra con lo stesso telefono o browser, riprende con il suo punteggio.

### 3.4 Durante la mano
- Si trascina il dito sulle lettere: la parola in costruzione compare sopra la griglia, con i punti che varrebbe, e il percorso resta disegnato. Quando si stacca il dito, la parola viene inviata.
- In alternativa si può usare la tastiera con il pulsante "Usa la tastiera". Scrivendo, QU corrisponde alla casella Qu.
- La parola è subito accettata o rifiutata, senza attese. Per le parole rifiutate si indica il motivo: troppo corta, non presente nella griglia, già trovata o non presente nel dizionario.
- In alto si vedono il tempo, una barra che si accorcia e i propri punti.

### 3.5 Fine mano
Si vede su due tab:
- **Classifica**: la propria posizione ("3° su 12") e la lista di tutti i giocatori con i punti della mano e il totale.
- **Parole**: tutte le parole trovate, con i punti e chi le ha trovate ("Giulia, Marco e altri 2"). Le parole trovate da te hanno l'etichetta TUA. In fondo ci sono quelle trovate solo dal computer, con il totale di parole possibili e il punteggio massimo. Ci sono i filtri Tutte, Le mie e Non trovate.

Poi ci sono il conto alla rovescia per la mano successiva e il pulsante "Segnala una parola mancante".

### 3.6 Se l'host esce
- La mano in corso arriva comunque alla fine.
- Poi la stanza passa a un altro giocatore, che diventa host e prende in carico approvazioni e impostazioni.
- Il nuovo host deve avere l'**app**, perché serve il dizionario per preparare le griglie. Si sceglie chi è nella stanza da più tempo.
- **(proposta)** Se nella stanza restano solo giocatori dal browser, la partita finisce dopo la mano in corso.

### 3.7 Segnalare una parola mancante
La segnalazione viene salvata su Firebase in un elenco che solo lo sviluppatore può leggere, dalla console di Firebase. Serve per migliorare il dizionario nelle versioni successive.

---

## 4. Aspetto

- **Stile moderno**: caselle arrotondate, numeri e lettere in Space Grotesk, testi in Inter. Il riferimento sono i mockup.
- Tema **Automatico** (segue il telefono), **Chiaro** o **Scuro**. Nell'app si sceglie nelle Impostazioni, nel browser con un pulsante.
- Stanza dell'host, dall'alto in basso: codice e Condividi, poi QR code e link, poi griglia, durata e lunghezza minima, poi le richieste di accesso (lista che scorre) e i giocatori nella stanza.
- Le liste reggono **tanti giocatori**: scorrono, i nomi lunghi vengono troncati e i dettagli stanno dietro "Vedi tutti".
- Pulsanti e caselle sono grandi almeno 44 px, e i colori hanno un contrasto leggibile in entrambi i temi.

### Schermate
| App | Browser |
|---|---|
| Home: Allenati, Crea stanza, Entra, Impostazioni | Ingresso: nickname e richiesta di accesso |
| Impostazioni: nickname, tema | Attesa approvazione |
| Allenamento (partita + risultati) | — |
| Stanza dell'host | — |
| Partita | Partita (uguale all'app) |
| Fine mano: Classifica e Parole | Fine mano: Classifica e Parole |

---

## 5. Architettura

### 5.1 Un solo codice per app e browser (proposta)
L'app e la versione browser fanno quasi le stesse cose, quindi conviene scriverle una volta sola:
- **TypeScript** con un framework web leggero (proposta: **Svelte**, che produce pagine piccole e veloci da caricare quando si inquadra il QR);
- **Capacitor** per trasformare la stessa applicazione web in un'app Android, aggiungendo dizionario, fotocamera per il QR e funzionamento offline;
- **Firebase Hosting** per la versione browser.

Le alternative sono Flutter, che produce una versione web più pesante e lenta al primo caricamento, oppure un'app Android nativa più un sito separato, cioè due codici da mantenere.

### 5.2 Firebase
Si usa il **piano gratuito (Spark)**, senza Cloud Functions.

| Servizio | A cosa serve |
|---|---|
| **Authentication (anonima)** | Dà a ogni telefono o browser un'identità invisibile, senza registrazione. Serve per le regole di sicurezza, per il blocco dei giocatori e per rientrare dopo una disconnessione. |
| **Realtime Database** | Stanze, giocatori, mani e parole in tempo reale. Sa anche quando un giocatore si disconnette, e serve per accorgersi che l'host è uscito. |
| **Hosting** | La pagina web per chi gioca dal browser. |

**(proposta) Realtime Database invece di Firestore.** È più adatto a un gioco in tempo reale e sa gestire le disconnessioni. Il limite del piano gratuito è di **100 connessioni contemporanee** su tutto il progetto, cioè 100 giocatori connessi nello stesso momento in tutte le stanze insieme. Per un gioco tra amici dovrebbe bastare. Se servisse di più, si passa al piano a consumo (Blaze), che per un uso piccolo costa pochissimo ma richiede una carta di credito.

### 5.3 Chi fa cosa
| Compito | Chi lo fa |
|---|---|
| Generare la griglia e trovare tutte le parole valide | App dell'host, all'inizio di ogni mano (la mano successiva si prepara durante la pausa) |
| Tenere il tempo | Firebase: l'inizio e la fine della mano sono orari del server, e ogni telefono corregge la differenza col proprio orologio |
| Controllare una parola proposta | Il telefono di chi la propone, confrontandola con l'elenco cifrato della mano |
| Rifiutare parole inviate fuori tempo o da chi non è in stanza | Regole di sicurezza di Firebase |
| Calcolare i punti della mano | Host, alla fine della mano: scrive i risultati su Firebase e tutti li leggono |
| Approvare, rifiutare, bloccare | Host |

### 5.4 Elenco delle parole e anti-imbroglio
- All'inizio della mano l'host carica due elenchi:
  1. le parole valide in **forma cifrata**: ogni parola viene trasformata in un codice (hash SHA-256 con un "sale" casuale diverso per ogni mano). Serve ai telefoni per controllare le parole proposte;
  2. le parole valide **in chiaro**, che le regole di Firebase rendono leggibili solo **dopo la fine della mano**.
- Così nessuno può leggere le soluzioni durante la mano, e i risultati di fine mano arrivano anche se l'host è uscito.
- Limite onesto: chi ha competenze tecniche potrebbe provare tutte le parole del dizionario contro i codici. Per un gioco tra amici è accettabile.

### 5.5 Dati su Firebase (bozza)
```
rooms/{codice}
  host: uid                       chi è l'host ora
  settings: {grid: 4|5, duration: 60|120|180, minLength: 4|5|6}
  status: "lobby" | "playing" | "closed"
  createdAt
  players/{uid}: {nickname, via: "app"|"web", joinedAt, online, total}
  requests/{uid}: {nickname, via, at}
  blocked/{uid}: true
  hands/{n}
    grid: ["C","A","R","T","S","QU", …]
    startsAt, endsAt              orari del server
    salt, hashes: [...]           per controllare le parole durante la mano
    solutions: [...]              in chiaro, leggibile solo dopo endsAt
    words/{uid}/{parola}: true    parole trovate da ciascuno
    results: {uid: punti}         scritti dall'host a fine mano
reports/{id}: {parola, grid, at}  segnalazioni, leggibili solo dallo sviluppatore
```

### 5.6 Regole di sicurezza (sintesi)
- Le stanze si leggono solo con il codice, e solo i giocatori approvati vedono le mani.
- Un giocatore scrive solo le proprie parole, e solo tra `startsAt` ed `endsAt`.
- Solo l'host scrive impostazioni, mani, risultati, approvazioni e blocchi.
- Un giocatore bloccato non può creare nuove richieste.
- Il blocco si lega all'identità anonima. Chi gioca dal browser e cancella i dati del browser può ripresentarsi come nuovo, e l'host può bloccarlo di nuovo.

### 5.7 Pulizia
**(proposta)** Quando l'host chiude la stanza, la stanza viene cancellata. Le stanze abbandonate restano su Firebase, ma occupano pochissimo: ogni volta che si crea una stanza, l'app cancella quelle create da sé stessa con più di 24 ore. Il piano gratuito offre 1 GB.

---

## 6. Dizionario

### Fonti
- **Morph-it!** (Università di Bologna): un lessico di forme flesse, con licenza CC BY-SA / LGPL.
- **Hunspell it_IT**, il correttore di LibreOffice, con licenza GPL. Si espandono gli affissi per ottenere tutte le forme.

### Preparazione
Uno script, lanciato una volta durante lo sviluppo e non nell'app, prepara il dizionario:
1. unisce le due liste;
2. toglie i nomi propri (le parole con la maiuscola in Hunspell, quelle segnate come nome proprio in Morph-it);
3. toglie le forme verbali con pronomi attaccati, usando le etichette di Morph-it. Va verificato quanto bene riesce a farlo;
4. toglie gli accenti, le parole con J, K, X, Y, W e quelle con una Q non seguita da U;
5. tiene solo le parole da 4 a 25 lettere, contando QU come 2;
6. aggiunge **ZAPP**;
7. salva il risultato in un formato compatto (un albero di lettere compresso) da mettere dentro l'app.

**Da verificare durante lo sviluppo:** la dimensione finale, che si stima in qualche MB, e la **compatibilità delle licenze**. La GPL di Hunspell potrebbe imporre condizioni all'app. Se crea problemi, si usa solo Morph-it.

### Ricerca delle parole
L'app esplora tutti i percorsi della griglia seguendo l'albero del dizionario, e si ferma appena un prefisso non esiste. Su un telefono richiede pochi millisecondi anche per una griglia 5x5.

---

## 7. Casi particolari

| Situazione | Comportamento |
|---|---|
| Un giocatore perde la connessione | Resta in classifica come "offline". Se rientra riprende, e le parole già inviate restano valide. |
| L'host perde la connessione | Come nel paragrafo 3.6. Se rientra prima della fine della mano, torna host. |
| Rimangono solo giocatori dal browser | La partita finisce dopo la mano in corso (proposta). |
| Due giocatori con lo stesso nickname | Si aggiunge un numero: "Marco", "Marco 2". |
| L'host cambia le impostazioni durante una mano | Le nuove impostazioni valgono dalla mano successiva. |
| Un telefono ha l'orologio sbagliato | Non conta: si usano gli orari del server di Firebase. |
| Una parola viene inviata dopo la fine | Firebase la rifiuta. |

---

## 8. Verifiche

- **Test automatici** su:
  - ricerca delle parole (griglie note con le loro soluzioni);
  - punteggio (tabella, Qu = 2, ZAPP = 10);
  - controllo dei percorsi sulla griglia;
  - generazione della griglia.
- **Test delle regole di sicurezza** con l'emulatore di Firebase: parole fuori tempo, giocatori non approvati o bloccati, chi non è host che prova a scrivere i risultati.
- **Prova reale** con più telefoni e browser nella stessa stanza, compresa l'uscita dell'host a metà mano.

---

## 9. Punti da confermare

1. Tecnologia: TypeScript con Svelte e Capacitor (5.1).
2. Realtime Database con il limite di 100 connessioni del piano gratuito (5.2).
3. Le proposte segnate nel documento:
   - accenti ignorati;
   - griglie con troppe poche parole scartate;
   - chi entra durante una mano aspetta la successiva;
   - la partita finisce se restano solo giocatori dal browser;
   - durata di 1, 2 o 3 minuti;
   - pulizia delle stanze dopo 24 ore.

## 10. Passi successivi
1. Revisione e approvazione di questo documento.
2. Piano di implementazione, diviso a tappe. Proposta di ordine:
   1. dizionario e ricerca delle parole;
   2. allenamento da soli;
   3. stanze su Firebase;
   4. versione browser;
   5. rifiniture.
3. Scrittura del codice.
