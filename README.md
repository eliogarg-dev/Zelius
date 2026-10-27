# Zelius — Paroliere tra amici

Il Paroliere (Boggle italiano) da giocare insieme: ognuno dal proprio telefono, con l'app Android o dal browser.
Design: [paroliere-design.md](paroliere-design.md) · Note di brainstorming: [brainstorming-paroliere.md](brainstorming-paroliere.md)

## Comandi

| Comando | A cosa serve |
|---|---|
| `npm install` | Installa le dipendenze |
| `npm run dev` | Avvia il gioco in locale nel browser |
| `npm test` | Esegue i test |
| `npm run check` | Controlla i tipi TypeScript e Svelte |
| `npm run build` | Prepara la versione da pubblicare in `dist/` |
| `npm run dizionario` | Rigenera il dizionario (vedi sotto) |

## Dizionario

Il gioco usa `public/dizionario.bin` (il Dizionario Zelius, circa 3 milioni di parole), già pronto nel repository. Per rigenerarlo:

1. scarica Morph-it! da https://docs.sslmit.unibo.it/lib/exe/fetch.php?media=resources:morph-it.tgz
2. estrai l'archivio in `data/raw/morphit/` (deve esistere `data/raw/morphit/current_version/morph-it_048.txt`)
3. esegui `npm run dizionario`: le altre fonti (paroleitaliane di Napolux e gli estratti di kaikki.org del Wikizionario
   e delle voci italiane del Wiktionary inglese, circa 120 MB) vengono scaricate da sole in `data/raw/` la prima volta

Lo script parte dalle parole di Morph-it! senza nomi propri e abbreviazioni, poi aggiunge le parole delle altre fonti
scartando nomi e cognomi. Completa i verbi che le fonti danno a metà (gerundio e imperativo "voi" regolari) e genera
tutte le forme con pronomi attaccati: infinito (mangiarlo, porlo, lavarsi), gerundio (andandosene) e imperativo
(dammelo, dillo, laviamoci, accendetevi). Genera poi gli alterati (-ino, -etto, -ello, -uccio, -otto, -one, -accio)
dei nomi di Morph-it e degli aggettivi brevi (tavolino, fuochino, bacione, grassotto), e gli avverbi in -mente
(rapidamente, facilmente, velocissimamente). Toglie gli accenti e le parole con J, K, X, Y, W o con meno di 4 lettere,
e aggiunge la parola speciale ZELIUS.
Per controllo scrive `data/parole.txt` (parole accettate) e `data/scarti.txt` (parole delle fonti nuove scartate come nomi propri).

## Crediti

Il file `public/dizionario.bin` (Dizionario Zelius) è un'opera derivata, distribuita con licenza
Creative Commons Attribution-ShareAlike 4.0. È costruito da:

- **Morph-it!** di Marco Baroni ed Eros Zanchetta (Università di Bologna), licenza CC BY-SA 2.0 e GNU LGPL;
- **Wikizionario** (https://it.wiktionary.org) e **Wiktionary inglese** (https://en.wiktionary.org, voci italiane con le tabelle di flessione),
  licenza CC BY-SA, tramite gli estratti di kaikki.org (wiktextract);
- **paroleitaliane** di Napolux (https://github.com/napolux/paroleitaliane), licenza MIT;
  le coniugazioni vengono da verb-data, licenza CC BY-SA 3.0.
