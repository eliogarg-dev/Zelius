<script lang="ts">
  // Griglia, durata, lunghezza minima, avanzamento e voto sulle scartate: un tocco passa al valore successivo.
  // L'attesa si regola con − e +.
  import type { Impostazioni } from '../lib/stanza/stanza.svelte.ts';

  let {
    impostazioni,
    nomeHost,
    modificabili,
    oncambia,
  }: { impostazioni: Impostazioni; nomeHost: string; modificabili: boolean; oncambia: (i: Impostazioni) => void } = $props();

  const orologio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const attesa = (passo: number) => oncambia({ ...impostazioni, attesa: Math.min(300, Math.max(10, impostazioni.attesa + passo)) });

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
  <button
    type="button"
    class={impostazioni.automatico ? 'doppia' : 'intera'}
    disabled={!modificabili}
    aria-label={`Prossima mano ${impostazioni.automatico ? 'automatica' : `avviata da ${nomeHost}`}${modificabili ? ', tocca per cambiare' : ''}`}
    onclick={() => oncambia({ ...impostazioni, automatico: !impostazioni.automatico })}
  >
    <span class="nome">Prossima mano</span><span class="valore display">{impostazioni.automatico ? 'Automatica' : `La avvia ${nomeHost}`}</span>
  </button>
  {#if impostazioni.automatico}
    <div class="casella">
      <span class="nome">Attesa</span>
      <div class="passi">
        {#if modificabili}
          <button type="button" class="passo" aria-label="Meno 10 secondi" disabled={impostazioni.attesa <= 10} onclick={() => attesa(-10)}>−</button>
        {/if}
        <span class="valore display" aria-label={`Attesa ${impostazioni.attesa} secondi`}>{orologio(impostazioni.attesa)}</span>
        {#if modificabili}
          <button type="button" class="passo" aria-label="Più 10 secondi" disabled={impostazioni.attesa >= 300} onclick={() => attesa(10)}>+</button>
        {/if}
      </div>
    </div>
  {/if}
  <button
    type="button"
    class="intera"
    disabled={!modificabili}
    aria-label={`Parole scartate: ${impostazioni.voto ? 'a fine mano se ne possono far votare due a testa' : 'non si votano'}${modificabili ? ', tocca per cambiare' : ''}`}
    onclick={() => oncambia({ ...impostazioni, voto: !impostazioni.voto })}
  >
    <span class="nome">Parole scartate</span><span class="valore display">{impostazioni.voto ? 'Ai voti, 2 a testa' : 'Non si votano'}</span>
  </button>
</div>

<style>
  .impostazioni {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  button,
  .casella {
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

  .intera {
    grid-column: 1 / -1;
  }

  .doppia {
    grid-column: span 2;
  }

  .passi {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .passo {
    min-height: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 18px;
    line-height: 1;
  }

  .passo:disabled {
    opacity: 0.35;
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
