<script lang="ts">
  import Icona from '../components/Icona.svelte';

  let {
    eApp,
    onallenati,
    oncrea,
    onentra,
    onimpostazioni,
    stanzeDisponibili,
  }: {
    eApp: boolean;
    onallenati: () => void;
    oncrea: () => void;
    onentra: () => void;
    onimpostazioni: () => void;
    stanzeDisponibili: boolean;
  } = $props();
</script>

<div class="testa">
  <button type="button" class="btn-icona" aria-label="Impostazioni" onclick={onimpostazioni}>
    <Icona nome="impostazioni" />
  </button>
</div>

<div class="logo" aria-label="Zelius" role="img">
  {#each [...'ZELIUS'] as l, i (i)}
    <span class="display" style:--i={i}>{l}</span>
  {/each}
</div>
<p class="sottotitolo muted">Il Paroliere da giocare insieme</p>

<div class="azioni">
  {#if eApp}
    <button type="button" class="btn btn-primario" onclick={onallenati}>Allenati da solo</button>
    <button type="button" class="btn grande" onclick={oncrea} disabled={!stanzeDisponibili}>Crea una stanza</button>
    <button type="button" class="btn grande" onclick={onentra} disabled={!stanzeDisponibili}>Entra in una stanza</button>
    {#if !stanzeDisponibili}
      <p class="muted nota">Le stanze non sono ancora configurate.</p>
    {/if}
  {:else}
    <button type="button" class="btn btn-primario" onclick={onentra} disabled={!stanzeDisponibili}>Entra in una stanza</button>
    <p class="muted nota">Per allenarti da solo e creare stanze usa l'app Android.</p>
  {/if}
</div>

<style>
  .testa {
    display: flex;
    justify-content: flex-end;
  }

  .logo {
    margin-top: 48px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
    padding: 8px;
    background: var(--surf);
    border: 1px solid var(--line);
    border-radius: 22px;
  }

  .logo span {
    aspect-ratio: 1;
    border-radius: 12px;
    background: var(--acc);
    color: var(--on-acc);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    animation: entra 500ms calc(var(--i) * 90ms) both ease-out;
  }

  @keyframes entra {
    from {
      transform: translateY(16px) scale(0.8);
      opacity: 0;
    }
  }

  .sottotitolo {
    text-align: center;
    margin: 16px 0 0;
    font-size: 16px;
  }

  .azioni {
    margin: auto 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .grande {
    min-height: 56px;
    border-radius: 28px;
    font-size: 17px;
  }

  .nota {
    text-align: center;
    font-size: 14px;
    margin: 4px 0 0;
  }
</style>
