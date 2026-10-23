<script lang="ts">
  // Schermata di una mano in corso: tempo, griglia, parola in costruzione, parole trovate.
  // È la stessa per l'allenamento e per le stanze; cambia solo chi controlla le parole.
  import { onDestroy } from 'svelte';
  import { conferma } from '../lib/conferma.ts';
  import { inParola, numeroLettere } from '../lib/game/alfabeto.ts';
  import { punti } from '../lib/game/punteggio.ts';
  import { MESSAGGI, type Esito, type Proposta } from '../lib/game/verifica.ts';
  import { PAROLA_SPECIALE, PUNTI_PAROLA_SPECIALE } from '../lib/game/punteggio.ts';
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
    oninterrompi,
    inAttesa = 0,
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
    /** Solo per l'host: interrompe la mano per tutti, tenendo premuta la X per 2 secondi. */
    oninterrompi?: () => void;
    /** Giocatori che aspettano di entrare (solo per l'host): entreranno a fine mano. */
    inAttesa?: number;
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
  onDestroy(() => {
    clearInterval(timer);
    clearTimeout(pressione);
  });

  let premuto = $state(false);
  let pressione: ReturnType<typeof setTimeout> | undefined;
  function tieni() {
    premuto = true;
    pressione = setTimeout(() => {
      lascia();
      void interrompi();
    }, 2000);
  }
  function lascia() {
    premuto = false;
    clearTimeout(pressione);
  }
  async function interrompi() {
    if (await conferma('Interrompere la mano per tutti? Contano le parole già trovate.', 'Interrompi')) oninterrompi?.();
  }

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
  let speciale = $state(false);
  let tastiera = $state(false);
  let testo = $state('');

  async function proponi(p: Proposta) {
    const esito = await verifica(p);
    if (esito.ok) {
      messaggio = { testo: `${esito.parola} +${esito.punti}`, ok: true };
      if (esito.parola === PAROLA_SPECIALE) {
        speciale = true;
        setTimeout(() => (speciale = false), 1600);
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
    {#if oninterrompi}
      <!-- Da tastiera (click senza puntatore) chiede subito conferma. -->
      <button
        type="button"
        class="btn-icona tieni"
        class:premuto
        aria-label="Interrompi la mano (tieni premuto)"
        onpointerdown={tieni}
        onpointerup={lascia}
        onpointerleave={lascia}
        onpointercancel={lascia}
        oncontextmenu={(e) => e.preventDefault()}
        onclick={(e) => e.detail === 0 && interrompi()}
      >
        <Icona nome="chiudi" />
      </button>
    {/if}
    <div class="pillola">{intestazione}</div>
    <div class="punteggio"><strong class="display">{totale}</strong> punti</div>
    {#if inAttesa > 0}
      <div class="campanella" role="status" aria-label={`${inAttesa} in attesa di entrare: potrai farli entrare a fine mano`}>
        <Icona nome="campanella" /> ({inAttesa})
      </div>
    {/if}
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

  {#if speciale}
    <div class="speciale display" aria-live="assertive">{PAROLA_SPECIALE}! <span>+{PUNTI_PAROLA_SPECIALE}</span></div>
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

  /* Si riempie di rosso nei 2 secondi in cui va tenuta premuta. */
  .tieni {
    touch-action: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  .tieni.premuto {
    background: var(--danger);
    color: var(--bg);
    transition: background 2s linear, color 2s linear;
  }

  .campanella {
    display: flex;
    align-items: center;
    gap: 2px;
    font-weight: 700;
    color: var(--warm);
    animation: squilla 2s infinite;
  }

  /* Si ingrandisce un po' e vibra, poi resta ferma fino al giro dopo. */
  @keyframes squilla {
    0%, 40%, 100% { transform: none; }
    5% { transform: scale(1.2) rotate(-14deg); }
    10% { transform: scale(1.2) rotate(12deg); }
    15% { transform: scale(1.2) rotate(-10deg); }
    20% { transform: scale(1.2) rotate(8deg); }
    25% { transform: scale(1.2) rotate(-4deg); }
    30% { transform: scale(1.1); }
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

  .speciale {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    font-size: 64px;
    color: var(--warm-bg);
    pointer-events: none;
    animation: speciale 1.6s ease-out forwards;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  }

  .speciale span {
    font-size: 40px;
  }

  @keyframes speciale {
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
