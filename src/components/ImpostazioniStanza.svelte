<script lang="ts">
  // Griglia, durata e lunghezza minima: un tocco passa al valore successivo.
  import type { Impostazioni } from '../lib/stanza/stanza.svelte.ts';

  let {
    impostazioni,
    modificabili,
    oncambia,
  }: { impostazioni: Impostazioni; modificabili: boolean; oncambia: (i: Impostazioni) => void } = $props();

  function successivo<T>(valori: readonly T[], attuale: T): T {
    return valori[(valori.indexOf(attuale) + 1) % valori.length];
  }
</script>

<div class="impostazioni">
  <button
    type="button"
    disabled={!modificabili}
    aria-label={`Griglia ${impostazioni.lato} per ${impostazioni.lato}${modificabili ? ', tocca per cambiare' : ''}`}
    onclick={() => oncambia({ ...impostazioni, lato: successivo([4, 5] as const, impostazioni.lato) })}
  >
    <span class="nome">Griglia</span><span class="valore display">{impostazioni.lato}×{impostazioni.lato}</span>
  </button>
  <button
    type="button"
    disabled={!modificabili}
    aria-label={`Durata ${impostazioni.durata / 60} minuti${modificabili ? ', tocca per cambiare' : ''}`}
    onclick={() => oncambia({ ...impostazioni, durata: successivo([60, 120, 180] as const, impostazioni.durata) })}
  >
    <span class="nome">Durata</span><span class="valore display">{impostazioni.durata / 60}:00</span>
  </button>
  <button
    type="button"
    disabled={!modificabili}
    aria-label={`Minimo ${impostazioni.minLettere} lettere${modificabili ? ', tocca per cambiare' : ''}`}
    onclick={() => oncambia({ ...impostazioni, minLettere: successivo([4, 5, 6] as const, impostazioni.minLettere) })}
  >
    <span class="nome">Minimo</span><span class="valore display">{impostazioni.minLettere} lettere</span>
  </button>
</div>

<style>
  .impostazioni {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  button {
    min-height: 60px;
    background: var(--surf);
    border: 1px solid var(--line);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  button:disabled {
    opacity: 1;
  }

  .nome {
    font-size: 12px;
    color: var(--muted);
  }

  .valore {
    font-size: 18px;
  }
</style>
