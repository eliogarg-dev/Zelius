<script module lang="ts">
  // L'animazione di avvio si vede solo la prima volta che compare la Home.
  let primaVolta = true;
</script>

<script lang="ts">
  import Avvio from '../components/Avvio.svelte';
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

  const conAvvio = primaVolta;
  primaVolta = false;
  let avvio = $state(conAvvio);
  const lettereLogo: HTMLElement[] = [];
</script>

{#if avvio}
  <Avvio bersagli={() => lettereLogo} onfine={() => (avvio = false)} />
{/if}

<div class="testa" class:nascosto={avvio} class:compare={conAvvio && !avvio}>
  <button type="button" class="btn-icona" aria-label="Impostazioni" onclick={onimpostazioni}>
    <Icona nome="impostazioni" />
  </button>
</div>

<div class="logo" class:nascosto={avvio} aria-label="Zelius" role="img">
  {#each [...'ZELIUS'] as l, i (i)}
    <span class="display quadrata" bind:this={lettereLogo[i]}>{l}</span>
  {/each}
</div>
<p class="sottotitolo muted" class:nascosto={avvio} class:compare={conAvvio && !avvio}>Il Paroliere da giocare insieme</p>

<div class="azioni" class:nascosto={avvio} class:compare={conAvvio && !avvio}>
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
    transition: background-color 300ms, border-color 300ms;
  }

  .logo.nascosto {
    background-color: transparent;
    border-color: transparent;
  }

  .logo.nascosto span {
    visibility: hidden;
  }

  .logo span {
    border-radius: 12px;
    background: var(--acc);
    color: var(--on-acc);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
  }

  .nascosto:not(.logo) {
    opacity: 0;
  }

  .compare {
    animation: compare 300ms ease-out;
  }

  @keyframes compare {
    from {
      transform: translateY(8px);
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
