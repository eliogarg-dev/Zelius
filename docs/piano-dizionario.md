# Dizionario Zelius: fonti unite + crediti discreti

## Contesto
Oggi `public/dizionario.bin` (380.641 parole) viene solo da Morph-it! e le Impostazioni mostrano una scheda "Dizionario" che lo cita.
L'utente vuole un dizionario "nostro", più ricco: Morph-it + tutte le parole di dizionari liberi in rete, con ogni forma flessa.
Decisioni prese:
- **Fonti aggiunte:** Napolux `paroleitaliane` (MIT; coniugazioni CC BY-SA 3.0) e Wikizionario (estratto kaikki.org, CC BY-SA).
  Scartati: ListediParole.it (© Ortograf, non riutilizzabile), Hunspell (GPL).
- **Filtro:** si accetta tutto tranne forme verbo+pronome, nomi propri/cognomi.
- **Crediti:** via la scheda, resta una riga discreta "Licenze e fonti" (la CC BY-SA obbliga a citare le fonti nell'app).

## 1. Script `scripts/prepara-dizionario.ts` (unico file di logica toccato)
Struttura invariata (DAWG, controllo, frequenze, `data/parole.txt`). Cambia la raccolta parole:

1. **Morph-it** (come ora) produce tre insiemi, tutti normalizzati con `inParola(inSimboli(...))`:
   - `A` accettate (come oggi);
   - `V` forme verbali senza pronomi (categoria in `CATEGORIE_VERBALI`), più gli infiniti senza la `e` finale (`mangiar`);
   - `R` rifiutate: forme con pronomi (`haPronomiAttaccati`) e `NPR`.
2. **Fonti nuove**, scaricate con `fetch` in `data/raw/` solo se mancano (Morph-it resta manuale come ora):
   - Napolux raw GitHub: `60000_parole_italiane.txt`, `280000_parole_italiane.txt`, `660000_parole_italiane.txt`, `coniugazione_verbi.txt` (una parola per riga);
   - Napolux `9000_nomi_propri.txt`, `lista_cognomi.txt`, `lista_38000_cognomi.txt` → aggiunti a `R` (solo come lista nera);
   - Wikizionario: `https://kaikki.org/downloads/it/it-extract.jsonl.gz` (~42 MB), letto in streaming (`zlib.createGunzip` + `readline`).
     Si tengono le voci con `lang_code === 'it'`, `pos` diverso da nome proprio/abbreviazione/simbolo, parola tutta minuscola; si prendono `word` e ogni `forms[].form`.
     Le voci nome proprio vanno in `R`. (Nomi esatti dei campi da verificare su qualche riga del file prima di scrivere il filtro.)
3. **Filtro per le parole nuove** (quelle non in `A`; `A` vince sempre, così `dalle`, `dici` restano):
   - stessi controlli di oggi: `SOLO_LETTERE`, `inSimboli` (via J K X Y W), `MIN_LETTERE`, `MAX_SIMBOLI`;
   - scarta se in `R`;
   - scarta se è verbo+pronome: per ogni coda in un elenco fisso (`lo la li le ne mi ti ci vi si gli` e combinazioni `melo mela … glielo gliene … sene`),
     tolta la coda resta `t`; scarta se `t`, `t+'e'` o `t` senza l'ultima consonante doppia (`dammi` → `da`) è in `V`.
     Esempi: `mangiarlo`, `dammelo`, `abbiamocela`, `accendetevi`, `andandosene`.
4. Unione + `ZELIUS` → DAWG come ora. Log con conteggio parole per fonte e scarti per motivo, per controllare a occhio.
5. `frequenze.json`: `fonte` → `"Dizionario Zelius (Morph-it!, Wikizionario, paroleitaliane), parole accettate dal gioco"`.

Funzioni riusate: `inSimboli`, `inParola`, `numeroLettere` (`src/lib/game/alfabeto.ts`), `costruisciDawg`, `Dizionario` (`src/lib/game/dawg.ts`), `haPronomiAttaccati` (già nello script).

## 2. Impostazioni `src/screens/Impostazioni.svelte`
Via la scheda `.crediti`. In fondo un `<details>` nativo, testo piccolo e smorzato:
- `<summary>`: "Licenze e fonti"
- contenuto: "Dizionario Zelius, licenza CC BY-SA 4.0. Costruito da: Morph-it! di M. Baroni ed E. Zanchetta (Univ. di Bologna, CC BY-SA 2.0);
  Wikizionario (CC BY-SA); paroleitaliane di Napolux (MIT; coniugazioni da verb-data, CC BY-SA 3.0)."

## 3. Documentazione
- `README.md`: sezione Dizionario (fonti, download automatico, solo Morph-it manuale) e Crediti con le stesse licenze.
- `STATO-LAVORI.md` riga 20: nuovo conteggio e dimensione.

## 4. Test `tests/gioco.test.ts` (blocco "dizionario vero")
I controlli esistenti (`mangiarlo`, `dammi`, `andandosene`, `roma` assenti) restano e diventano la verifica del nuovo filtro.
Aggiungo ai rifiutati `dammelo`, `abbiamocela`, `accendetevi`, e ai presenti una parola che arriva solo dalle fonti nuove (scelta dal log dello script).

## Verifica
1. `npm run dizionario` → leggo i conteggi, guardo un campione delle parole nuove in `data/parole.txt` (diff con la versione Morph-it) cercando pronomi attaccati o nomi.
2. `npm test` (incluso il limite 2 s della mano 5x5) e `npm run check`.
3. `npm run dev` → Impostazioni: la scheda non c'è, "Licenze e fonti" si apre e mostra i crediti.
4. Dimensione di `public/dizionario.bin` riportata all'utente (prevista sotto 1 MB).
