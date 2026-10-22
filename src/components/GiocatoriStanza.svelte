<script lang="ts">
  import type { Stanza } from '../lib/stanza/stanza.svelte.ts';

  let { stanza, massimo = 11 }: { stanza: Stanza; massimo?: number } = $props();

  let tutti = $state(false);
  const elenco = $derived(
    Object.entries(stanza.giocatori)
      .sort((a, b) => Number(b[1].online) - Number(a[1].online) || a[1].entrato - b[1].entrato)
      .map(([uid, g]) => ({ uid, ...g, io: uid === stanza.uid, host: uid === stanza.meta?.host })),
  );
  const visibili = $derived(tutti ? elenco : elenco.slice(0, massimo));
</script>

<div class="titolo">
  <span>In stanza · {stanza.numeroOnline}</span>
  {#if elenco.length > massimo}
    <button type="button" class="btn-testo" onclick={() => (tutti = !tutti)}>{tutti ? 'Mostra meno' : 'Vedi tutti'}</button>
  {/if}
</div>

<ul class="giocatori">
  {#each visibili as g (g.uid)}
    <li class:offline={!g.online}>
      <span class="avatar display" class:io={g.io}>{g.io ? 'Tu' : g.nome[0]?.toUpperCase()}</span>
      <span class="nome">{g.io ? 'Tu' : g.nome}{g.host ? ' ★' : ''}</span>
    </li>
  {/each}
  {#if !tutti && elenco.length > massimo}
    <li>
      <span class="avatar display altri">+{elenco.length - massimo}</span>
      <span class="nome">altri</span>
    </li>
  {/if}
</ul>

<style>
  .titolo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }

  .giocatori {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
  }

  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-width: 0;
  }

  li.offline {
    opacity: 0.45;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    background: var(--surf2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
  }

  .avatar.io {
    background: var(--acc);
    color: var(--on-acc);
  }

  .avatar.altri {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--line);
  }

  .nome {
    font-size: 12px;
    color: var(--muted);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
