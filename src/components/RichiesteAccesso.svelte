<script lang="ts">
  import Icona from './Icona.svelte';
  import type { Stanza } from '../lib/stanza/stanza.svelte.ts';

  let { stanza, altezza = '196px' }: { stanza: Stanza; altezza?: string } = $props();

  const elenco = $derived(Object.entries(stanza.richieste).sort((a, b) => a[1].at - b[1].at));
</script>

<div class="titolo">
  <span>Vogliono entrare</span>
  <span class="conteggio">{elenco.length}</span>
  {#if elenco.length > 1}
    <button type="button" class="btn-testo tutti" onclick={() => stanza.approvaTutti()}>Approva tutti</button>
  {/if}
</div>

{#if elenco.length === 0}
  <p class="muted vuoto">Nessuna richiesta per ora. Condividi il link o fai inquadrare il QR code.</p>
{:else}
  <ul class="elenco" style:max-height={altezza}>
    {#each elenco as [uid, r] (uid)}
      <li class="richiesta">
        <span class="avatar display">{r.nome[0]?.toUpperCase()}</span>
        <span class="chi">
          <span class="nome">{r.nome}</span>
          <span class="via">{r.via === 'app' ? "dall'app" : 'dal browser'}</span>
        </span>
        <button type="button" class="btn-icona blocca" aria-label={`Blocca ${r.nome}`} onclick={() => stanza.blocca(uid)}>
          <Icona nome="blocca" />
        </button>
        <button type="button" class="btn-icona" aria-label={`Rifiuta ${r.nome}`} onclick={() => stanza.rifiuta(uid)}>
          <Icona nome="chiudi" />
        </button>
        <button type="button" class="approva" onclick={() => stanza.approva(uid)}>Approva</button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .titolo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .conteggio {
    background: var(--warm-bg);
    color: var(--on-warm);
    font-size: 13px;
    font-weight: 700;
    border-radius: 10px;
    padding: 2px 8px;
  }

  .tutti {
    margin-left: auto;
  }

  .vuoto {
    font-size: 14px;
    margin: 8px 0 0;
  }

  .elenco {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .richiesta {
    flex-shrink: 0;
    background: var(--surf);
    border-radius: 14px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    background: var(--surf2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .chi {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .nome {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .via {
    font-size: 12px;
    color: var(--muted);
  }

  .blocca {
    color: var(--danger);
  }

  .btn-icona {
    background: transparent;
    flex-shrink: 0;
  }

  .approva {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 22px;
    border: 0;
    background: var(--acc);
    color: var(--on-acc);
    font-weight: 600;
    font-size: 15px;
  }
</style>
