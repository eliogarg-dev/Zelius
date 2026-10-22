<script lang="ts">
  // Schermata di una mano in corso: tempo, griglia, parola in costruzione, parole trovate.
  // È la stessa per l'allenamento e per le stanze; cambia solo chi controlla le parole.
  import { onDestroy } from 'svelte';
  import { inParola, numeroLettere } from '../lib/game/alfabeto.ts';
  import { punti } from '../lib/game/punteggio.ts';
  import { MESSAGGI, type Esito, type Proposta } from '../lib/game/verifica.ts';
  import { PAROLA_SPECIALE } from '../lib/game/punteggio.ts';
  import Griglia from './Griglia.svelte';
  import Icona from './Icona.svelte';

  let {
    griglia,
    fineAlle,
    durata,
    minLettere,
    intestazione,
    trovate,
    verifica,
    onfine,
    onesci,
  }: {
    griglia: number[];
    /** Istante di fine mano, in millisecondi dell'orologio locale. */
    fineAlle: number;
    durata: number;
    minLettere: number;
    intestazione: string;
    trovate: { parola: string; punti: number }[];
    verifica: (p: Proposta) => Promise<Esito>;
    onfine: () => void;
    onesci?: () => void;
  } = $props();

  let adesso = $state(Date.now());
  let finita = false;
  const timer = setInterval(() => {
    adesso = Date.now();
    if (!finita && adesso >= fineAlle) {
      finita = true;
      onfine();
    }
  }, 200);
  onDestroy(() => clearInterval(timer));

  const restanti = $derived(Math.max(0, Math.ceil((fineAlle - adesso) / 1000)));
  const tempo = $derived(`${Math.floor(restanti / 60)}:${String(restanti % 60).padStart(2, '0')}`);
  const quota = $derived(Math.max(0, Math.min(1, (fineAlle - adesso) / durata)));
  const totale = $derived(trovate.reduce((s, t) => s + t.punti, 0));

  let percorso: number[] = $state([]);
  const anteprima = $derived.by(() => {
    if (percorso.length === 0) return null;
    const simboli = percorso.map((c) => griglia[c]);
    const parola = inParola(simboli);
    const lettere = numeroLettere(simboli);
    return { parola, punti: lettere >= minLettere ? punti(parola, lettere) : 0 };
  });

  let messaggio: { testo: string; ok: boolean } | null = $state(null);
  let zapp = $state(false);
  let tastiera = $state(false);
  let testo = $state('');

  async function proponi(p: Proposta) {
    const esito = await verifica(p);
    if (esito.ok) {
      messaggio = { testo: `${esito.parola} +${esito.punti}`, ok: true };
      if (esito.parola === PAROLA_SPECIALE) {
        zapp = true;
        setTimeout(() => (zapp = false), 1600);
      }
    } else if (esito.parola.length > 0) {
      messaggio = { testo: `${esito.parola} ${MESSAGGI[esito.motivo]}`, ok: false };
    }
  }

  function inviaTesto(e: SubmitEvent) {
    e.preventDefault();
    if (testo.trim()) proponi({ testo });
    testo = '';
  }
</script>

<div class="mano">
  <div class="testa">
    {#if onesci}
      <button type="button" class="btn-icona" aria-label="Esci" onclick={onesci}><Icona nome="chiudi" /></button>
    {/if}
    <div class="pillola">{intestazione}</div>
    <div class="punteggio"><strong class="display">{totale}</strong> punti</div>
  </div>

  <div class="tempo">
    <div class="orologio display" role="timer" aria-label={`Tempo rimasto ${tempo}`}>{tempo}</div>
    <div class="barra"><div style:width={`${quota * 100}%`}></div></div>
  </div>

  <div class="anteprima" aria-live="polite">
    {#if anteprima}
      <span class="display parola">{anteprima.parola}</span>
      {#if anteprima.punti > 0}<span class="bollino">+{anteprima.punti}</span>{/if}
    {:else if messaggio}
      <span class="messaggio" class:ok={messaggio.ok}>{messaggio.testo}</span>
    {/if}
  </div>

  <Griglia {griglia} bind:percorso onparola={(simboli, percorso) => proponi({ simboli, percorso })} />

  {#if tastiera}
    <form class="tastiera" onsubmit={inviaTesto}>
      <label for="parola" class="solo-lettori">Parola</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input id="parola" class="campo" bind:value={testo} autocomplete="off" autocapitalize="characters" spellcheck="false" autofocus placeholder="Scrivi una parola" />
      <button type="submit" class="btn-icona invia" aria-label="Invia"><Icona nome="invia" /></button>
    </form>
  {/if}

  <div class="etichetta trovate-titolo">Le tue parole · {trovate.length}</div>
  <div class="trovate">
    {#each [...trovate].reverse() as t (t.parola)}
      <span class="chip"><span>{t.parola}</span><span class="pt">+{t.punti}</span></span>
    {/each}
  </div>

  <button type="button" class="btn alterna" onclick={() => (tastiera = !tastiera)}>
    <Icona nome="tastiera" />
    {tastiera ? 'Nascondi la tastiera' : 'Usa la tastiera'}
  </button>

  {#if zapp}
    <div class="zapp display" aria-live="assertive">ZAPP! <span>+10</span></div>
  {/if}
</div>

<style>
  .mano {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .testa {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pillola {
    background: var(--surf);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 6px 12px;
    font-size: 14px;
    color: var(--muted);
  }

  .punteggio {
    margin-left: auto;
    font-size: 15px;
    color: var(--muted);
  }

  .punteggio strong {
    font-size: 22px;
    color: var(--text);
  }

  .tempo {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .orologio {
    font-size: 52px;
    line-height: 1;
    text-align: center;
  }

  .barra {
    height: 6px;
    background: var(--surf2);
    border-radius: 3px;
    overflow: hidden;
  }

  .barra div {
    height: 100%;
    background: var(--acc);
    border-radius: 3px;
    transition: width 200ms linear;
  }

  .anteprima {
    height: 56px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .parola {
    font-size: 30px;
    letter-spacing: 0.06em;
  }

  .bollino {
    background: var(--warm-bg);
    color: var(--on-warm);
    font-size: 15px;
    font-weight: 700;
    border-radius: 12px;
    padding: 3px 10px;
  }

  .messaggio {
    font-size: 16px;
    font-weight: 600;
    color: var(--danger);
  }

  .messaggio.ok {
    color: var(--ok);
  }

  .tastiera {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }

  .tastiera input {
    text-transform: uppercase;
  }

  .invia {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background: var(--acc);
    color: var(--on-acc);
    border: 0;
  }

  .trovate-titolo {
    margin-top: 16px;
  }

  .trovate {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    background: var(--surf);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 6px 12px;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    gap: 8px;
  }

  .pt {
    color: var(--warm);
  }

  .alterna {
    margin: auto auto 0;
    padding-top: 0;
    margin-top: 20px;
  }

  .zapp {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 72px;
    color: var(--warm-bg);
    pointer-events: none;
    animation: zapp 1.6s ease-out forwards;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  }

  .zapp span {
    font-size: 40px;
  }

  @keyframes zapp {
    0% {
      transform: scale(0.4) rotate(-8deg);
      opacity: 0;
    }
    20% {
      transform: scale(1.15) rotate(3deg);
      opacity: 1;
    }
    70% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }
</style>
