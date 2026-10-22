<script lang="ts">
  // Allenamento da soli: funziona senza internet.
  import { caricaDizionario } from '../lib/dizionario.ts';
  import { preparaMano, type Lato } from '../lib/game/griglia.ts';
  import type { Soluzione } from '../lib/game/risolutore.ts';
  import { verificaParola, type Proposta } from '../lib/game/verifica.ts';
  import ElencoParole, { type VoceParola } from '../components/ElencoParole.svelte';
  import Griglia from '../components/Griglia.svelte';
  import Icona from '../components/Icona.svelte';
  import Mano from '../components/Mano.svelte';

  let { onesci }: { onesci: () => void } = $props();

  let lato: Lato = $state(4);
  let minuti = $state(2);
  let minLettere = $state(4);

  type Fase = 'impostazioni' | 'gioco' | 'fine';
  let fase: Fase = $state('impostazioni');
  let errore = $state('');
  let preparando = $state(false);

  let griglia: number[] = $state([]);
  let soluzioni: Soluzione[] = $state([]);
  let perParola = new Map<string, Soluzione>();
  let trovate: { parola: string; punti: number }[] = $state([]);
  let fineAlle = $state(0);
  let selezionata: string | null = $state(null);

  async function inizia() {
    preparando = true;
    errore = '';
    try {
      const diz = await caricaDizionario();
      const mano = preparaMano(lato, minLettere, diz);
      griglia = mano.griglia;
      soluzioni = mano.soluzioni;
      perParola = new Map(mano.soluzioni.map((s) => [s.parola, s]));
      trovate = [];
      selezionata = null;
      fineAlle = Date.now() + minuti * 60_000;
      fase = 'gioco';
    } catch (e) {
      errore = 'Non riesco a caricare il dizionario. Riprova.';
      console.error(e);
    } finally {
      preparando = false;
    }
  }

  async function verifica(p: Proposta) {
    const esito = await verificaParola(p, griglia, minLettere, new Set(trovate.map((t) => t.parola)), (parola) =>
      perParola.has(parola),
    );
    if (esito.ok) trovate = [...trovate, { parola: esito.parola, punti: esito.punti }];
    return esito;
  }

  const mie = $derived(new Set(trovate.map((t) => t.parola)));
  const totale = $derived(trovate.reduce((s, t) => s + t.punti, 0));
  const massimo = $derived(soluzioni.reduce((s, t) => s + t.punti, 0));
  const voci: VoceParola[] = $derived(
    soluzioni.map((s) => ({
      parola: s.parola,
      punti: s.punti,
      mia: mie.has(s.parola),
      mancata: !mie.has(s.parola),
      dettaglio: mie.has(s.parola) ? 'Trovata' : 'Non trovata',
    })),
  );
  const evidenzia = $derived(selezionata ? (perParola.get(selezionata)?.percorso ?? []) : []);
</script>

{#if fase === 'impostazioni'}
  <div class="testa">
    <button type="button" class="btn-icona" aria-label="Indietro" onclick={onesci}><Icona nome="indietro" /></button>
    <h1 class="display">Allenamento</h1>
  </div>

  <div class="opzioni">
    <div>
      <div class="etichetta">Griglia</div>
      <div class="segmenti">
        {#each [4, 5] as const as l (l)}
          <button type="button" aria-pressed={lato === l} onclick={() => (lato = l)}>{l}×{l}</button>
        {/each}
      </div>
    </div>
    <div>
      <div class="etichetta">Durata</div>
      <div class="segmenti">
        {#each [1, 2, 3] as m (m)}
          <button type="button" aria-pressed={minuti === m} onclick={() => (minuti = m)}>{m}:00</button>
        {/each}
      </div>
    </div>
    <div>
      <div class="etichetta">Lunghezza minima</div>
      <div class="segmenti">
        {#each [4, 5, 6] as n (n)}
          <button type="button" aria-pressed={minLettere === n} onclick={() => (minLettere = n)}>{n} lettere</button>
        {/each}
      </div>
    </div>
  </div>

  {#if errore}<p class="errore">{errore}</p>{/if}
  <button type="button" class="btn btn-primario inizia" disabled={preparando} onclick={inizia}>
    {preparando ? 'Preparo la griglia…' : 'Inizia'}
  </button>
{:else if fase === 'gioco'}
  <Mano
    {griglia}
    {fineAlle}
    durata={minuti * 60_000}
    {minLettere}
    intestazione={`Allenamento · ${lato}×${lato}`}
    {trovate}
    {verifica}
    onfine={() => (fase = 'fine')}
    onesci={() => (fase = 'fine')}
  />
{:else}
  <div class="testa">
    <h1 class="display">Fine mano</h1>
  </div>

  <div class="scheda riepilogo">
    <div>
      <div class="muted piccolo">I tuoi punti</div>
      <div class="display grande">{totale} <span class="muted su">su {massimo}</span></div>
    </div>
    <div class="destra">
      <div class="muted piccolo">Parole</div>
      <div class="display grande">{trovate.length} <span class="muted su">su {soluzioni.length}</span></div>
    </div>
  </div>

  <div class="griglia-risultati">
    <Griglia {griglia} attiva={false} {evidenzia} />
    <p class="muted piccolo suggerimento">
      {selezionata ? `Percorso di ${selezionata}` : 'Tocca una parola per vedere dove si trova.'}
    </p>
  </div>

  <ElencoParole {voci} {selezionata} onseleziona={(p) => (selezionata = selezionata === p ? null : p)} />

  <div class="azioni">
    <button type="button" class="btn btn-primario" onclick={inizia} disabled={preparando}>Gioca ancora</button>
    <div class="secondarie">
      <button type="button" class="btn-testo" onclick={() => (fase = 'impostazioni')}>Cambia impostazioni</button>
      <button type="button" class="btn-testo" onclick={onesci}>Torna alla home</button>
    </div>
  </div>
{/if}

<style>
  .testa {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 28px;
  }

  .opzioni {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .inizia {
    margin-top: auto;
  }

  .errore {
    color: var(--danger);
    font-weight: 600;
  }

  .riepilogo {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    border: 1px solid var(--line);
  }

  .destra {
    text-align: right;
  }

  .piccolo {
    font-size: 13px;
  }

  .grande {
    font-size: 26px;
  }

  .su {
    font-size: 15px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  .griglia-risultati {
    margin: 16px auto 8px;
    width: 72%;
  }

  .suggerimento {
    text-align: center;
    margin: 8px 0 12px;
  }

  /* Le parole possono essere centinaia: i pulsanti restano sempre visibili in basso. */
  .azioni {
    position: sticky;
    bottom: 0;
    margin: 20px -20px calc(-1 * max(20px, env(safe-area-inset-bottom)));
    padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    background: var(--bg);
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .azioni .secondarie {
    display: flex;
    gap: 16px;
  }
</style>
