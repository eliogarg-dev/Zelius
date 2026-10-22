# Zapp — Paroliere tra amici

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

Il gioco usa `public/dizionario.bin`, già pronto nel repository. Per rigenerarlo:

1. scarica Morph-it! da https://docs.sslmit.unibo.it/lib/exe/fetch.php?media=resources:morph-it.tgz
2. estrai l'archivio in `data/raw/morphit/` (deve esistere `data/raw/morphit/current_version/morph-it_048.txt`)
3. esegui `npm run dizionario`

Lo script toglie nomi propri, abbreviazioni, forme verbali con pronomi attaccati, accenti e parole con J, K, X, Y, W,
poi aggiunge la parola speciale ZAPP.

## Crediti

Il dizionario deriva da **Morph-it!** di Marco Baroni ed Eros Zanchetta (Università di Bologna),
distribuito con licenza Creative Commons Attribution-ShareAlike 2.0 e GNU LGPL.
Il file `public/dizionario.bin` è un'opera derivata ed è distribuito con le stesse licenze.
