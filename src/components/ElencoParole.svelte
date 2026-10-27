<script lang="ts" module>
  export interface VoceParola {
    parola: string;
    punti: number;
    /** Riga sotto la parola, es. "Trovata da Giulia, Marco e altri 2". */
    dettaglio?: string;
    mia: boolean;
    /** Nessun giocatore l'ha trovata: l'ha trovata solo il computer. */
    mancata: boolean;
  }
</script>

<script lang="ts">
  let {
    voci,
    etichettaTua = false,
    selezionata = null,
    onseleziona,
  }: {
    voci: VoceParola[];
    /** Mostra l'etichetta TUA sulle parole trovate dal giocatore (utile con più giocatori). */
    etichettaTua?: boolean;
    selezionata?: string | null;
    onseleziona?: (parola: string) => void;
  } = $props();

  type Filtro = 'tutte' | 'mie' | 'mancate';
  let filtro = $state<Filtro>('tutte');

  const filtri: [Filtro, string][] = [
    ['tutte', 'Tutte'],
    ['mie', 'Le mie'],
    ['mancate', 'Non trovate'],
  ];
  // Le parole non trovate possono essere centinaia: si mostrano le più ricche, una pagina alla volta.
  const PAGINA = 20;
  let mostrate = $state(PAGINA);
  $effect.pre(() => {
    void voci;
    mostrate = PAGINA;
  });

  const mancate = $derived(
    voci.filter((v) => v.mancata).sort((a, b) => b.punti - a.punti || a.parola.localeCompare(b.parola)),
  );
  const visibili = $derived(
    filtro === 'mie'
      ? voci.filter((v) => v.mia)
      : [...(filtro === 'tutte' ? voci.filter((v) => !v.mancata) : []), ...mancate.slice(0, mostrate)],
  );
  const restanti = $derived(filtro === 'mie' ? 0 : Math.max(0, mancate.length - mostrate));
</script>

<div class="filtri">
  {#each filtri as [id, testo] (id)}
    <button type="button" aria-pressed={filtro === id} onclick={() => (filtro = id)}>{testo}</button>
  {/each}
</div>

<ul class="elenco">
  {#each visibili as v (v.parola)}
    <li>
      <button
        type="button"
        class="voce"
        class:mancata={v.mancata}
        class:selezionata={selezionata === v.parola}
        onclick={() => onseleziona?.(v.parola)}
      >
        <span class="testo">
          <span class="riga">
            <span class="parola display">{v.parola}</span>
            {#if etichettaTua && v.mia}<span class="tua">TUA</span>{/if}
          </span>
          {#if v.dettaglio}<span class="dettaglio">{v.dettaglio}</span>{/if}
        </span>
        <span class="punti">{v.punti}</span>
      </button>
    </li>
  {:else}
    <li class="vuoto muted">Nessuna parola.</li>
  {/each}
</ul>

{#if restanti > 0}
  <button type="button" class="btn-testo altre" onclick={() => (mostrate += PAGINA)}>
    Carica altre <span class="muted">(ne restano {restanti})</span>
  </button>
{/if}

<style>
  .filtri {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filtri button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
  }

  .filtri button[aria-pressed='true'] {
    background: var(--acc);
    border-color: var(--acc);
    color: var(--on-acc);
  }

  .elenco {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .voce {
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid var(--surf);
    background: var(--surf);
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  }

  .voce.mancata {
    background: transparent;
    border: 1px dashed var(--dash);
  }

  .voce.mancata .parola {
    color: var(--soft);
  }

  .voce.selezionata {
    border: 2px solid var(--acc);
  }

  .testo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .riga {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .parola {
    font-size: 17px;
    letter-spacing: 0.04em;
  }

  .tua {
    background: var(--acc);
    color: var(--on-acc);
    font-size: 11px;
    font-weight: 700;
    border-radius: 8px;
    padding: 1px 7px;
  }

  .dettaglio {
    font-size: 13px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .punti {
    min-width: 30px;
    text-align: right;
    color: var(--warm);
    font-weight: 700;
    font-size: 15px;
  }

  .altre {
    display: block;
    margin: 8px auto 0;
  }

  .vuoto {
    padding: 12px 0;
    font-size: 15px;
  }
</style>
