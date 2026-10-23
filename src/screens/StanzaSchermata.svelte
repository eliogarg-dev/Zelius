<script lang="ts">
  import GiocatoriStanza from '../components/GiocatoriStanza.svelte';
  import Icona from '../components/Icona.svelte';
  import ImpostazioniStanza from '../components/ImpostazioniStanza.svelte';
  import Mano from '../components/Mano.svelte';
  import QrCode from '../components/QrCode.svelte';
  import RichiesteAccesso from '../components/RichiesteAccesso.svelte';
  import RisultatiMano from '../components/RisultatiMano.svelte';
  import { Share } from '@capacitor/share';
  import { conferma } from '../lib/conferma.ts';
  import { linkStanza } from '../lib/piattaforma.ts';
  import type { Stanza } from '../lib/stanza/stanza.svelte.ts';

  let { stanza, onesci }: { stanza: Stanza; onesci: () => void } = $props();

  const link = $derived(linkStanza(stanza.codice));
  const nomeHost = $derived(stanza.giocatori[stanza.meta?.host ?? '']?.nome ?? "l'host");
  const numeroRichieste = $derived(Object.keys(stanza.richieste).length);
  const secondi = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
  const orologio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const alInizio = $derived(secondi((stanza.mano?.inizio ?? 0) - stanza.adesso));

  let avviso = $state('');
  let pannello: 'richieste' | 'impostazioni' | null = $state(null);
  let avviando = $state(false);
  // Avanzamento automatico fermato per chi aspetta di entrare: l'host trova subito le richieste aperte.
  const inPausa = $derived(stanza.meta?.pausa === true);
  $effect(() => {
    if (stanza.eHost && inPausa) pannello = 'richieste';
  });

  async function condividi() {
    const dati = { title: 'Zelius · Paroliere', text: `Gioca con me a Zelius! Stanza ${stanza.codice}`, url: link };
    try {
      // Nell'app la WebView non ha navigator.share: il plugin usa la condivisione di Android.
      if ((await Share.canShare()).value) await Share.share(dati);
      else {
        await navigator.clipboard.writeText(link);
        mostra('Link copiato');
      }
    } catch {
      // Condivisione annullata.
    }
  }

  function mostra(testo: string) {
    avviso = testo;
    setTimeout(() => (avviso = ''), 2000);
  }

  async function avvia(azione: () => Promise<void>) {
    avviando = true;
    try {
      await azione();
    } catch (e) {
      console.error(e);
      mostra('Non riesco a iniziare. Riprova.');
    } finally {
      avviando = false;
    }
  }

  async function esci() {
    if (stanza.eHost) {
      if (!(await conferma("Uscendo, la stanza passerà a un altro giocatore con l'app. Vuoi uscire?", 'Esci'))) return;
    } else if (stanza.accesso === 'dentro' && !(await conferma('Vuoi uscire dalla stanza?', 'Esci'))) return;
    onesci();
  }

  async function chiudi() {
    if (!(await conferma('Chiudere la stanza per tutti?', 'Chiudi'))) return;
    await stanza.chiudi();
    onesci();
  }
</script>

{#snippet testata(titolo: string, sottotitolo: string, compatta = false)}
  <div class="testa">
    <button type="button" class="btn-icona" aria-label="Esci dalla stanza" onclick={esci}><Icona nome="chiudi" /></button>
    <div class="titoli">
      <div class="muted piccolo">{sottotitolo}</div>
      <div class="display titolo" class:compatta>{titolo}</div>
    </div>
    {#if compatta}
      <button type="button" class="btn-icona" aria-label="Condividi il link della stanza" onclick={condividi}><Icona nome="condividi" /></button>
    {:else}
      <button type="button" class="btn" onclick={condividi}><Icona nome="condividi" /> Condividi</button>
    {/if}
  </div>
{/snippet}

{#snippet strumentiHost()}
  {#if stanza.eHost}
    <div class="strumenti">
      <button type="button" class="btn" aria-expanded={pannello === 'richieste'} onclick={() => (pannello = pannello === 'richieste' ? null : 'richieste')}>
        Richieste
        {#if numeroRichieste > 0}<span class="badge">{numeroRichieste}</span>{/if}
      </button>
      <button type="button" class="btn" aria-expanded={pannello === 'impostazioni'} onclick={() => (pannello = pannello === 'impostazioni' ? null : 'impostazioni')}>
        Impostazioni
      </button>
      <button type="button" class="btn pericolo" aria-label="Chiudi la stanza per tutti" onclick={chiudi}>Chiudi</button>
    </div>
    {#if pannello === 'richieste'}
      <div class="pannello"><RichiesteAccesso {stanza} altezza="260px" /></div>
    {:else if pannello === 'impostazioni'}
      <div class="pannello">
        <ImpostazioniStanza impostazioni={stanza.impostazioni} {nomeHost} modificabili oncambia={(i) => stanza.cambiaImpostazioni(i)} />
        <p class="muted piccolo">Valgono dalla prossima mano.</p>
      </div>
    {/if}
  {/if}
{/snippet}

{#if stanza.accesso === 'caricamento'}
  <p class="centro muted">Collegamento alla stanza…</p>
{:else if stanza.accesso !== 'dentro'}
  <div class="messaggio-pieno">
    {#if stanza.accesso === 'richiesta'}
      <div class="display grande">Stanza {stanza.codice}</div>
      <p>Hai chiesto di entrare. Aspetta che l'host ti faccia entrare.</p>
      <div class="attesa" aria-hidden="true"><span></span><span></span><span></span></div>
    {:else if stanza.accesso === 'rifiutato'}
      <div class="display grande">Non ti ha fatto entrare</div>
      <p>L'host ha rifiutato la richiesta. Puoi chiedere di nuovo.</p>
      <button type="button" class="btn btn-primario" onclick={() => stanza.chiediDiNuovo()}>Chiedi di nuovo</button>
    {:else if stanza.accesso === 'bloccato'}
      <div class="display grande">Accesso bloccato</div>
      <p>Non puoi entrare in questa stanza.</p>
    {:else if stanza.accesso === 'inesistente'}
      <div class="display grande">Stanza non trovata</div>
      <p>Controlla il codice: la stanza {stanza.codice} non esiste o è stata chiusa.</p>
    {:else if stanza.accesso === 'chiusa'}
      <div class="display grande">Stanza chiusa</div>
      <p>L'host ha chiuso la stanza. Grazie di aver giocato!</p>
    {:else}
      <div class="display grande">Qualcosa non va</div>
      <p>Non riesco a entrare nella stanza. Riprova tra poco.</p>
    {/if}
    <button type="button" class="btn-testo" onclick={onesci}>Torna alla home</button>
  </div>
{:else if stanza.fase === 'attesa'}
  {@render testata(stanza.codice, stanza.eHost ? 'La tua stanza' : `Stanza di ${nomeHost}`)}

  <div class="scheda qr-scheda">
    <QrCode testo={link} dimensione={88} />
    <div class="qr-testo">
      <div class="muted piccolo">Inquadra per entrare, anche senza app</div>
      <div class="link">{link.replace(/^https?:\/\//, '')}</div>
    </div>
  </div>

  <div class="sezione">
    <ImpostazioniStanza impostazioni={stanza.impostazioni} {nomeHost} modificabili={stanza.eHost} oncambia={(i) => stanza.cambiaImpostazioni(i)} />
  </div>

  {#if stanza.eHost}
    <div class="sezione"><RichiesteAccesso {stanza} /></div>
  {:else}
    <p class="sezione muted">Sei dentro! Aspetta che {nomeHost} inizi la partita.</p>
  {/if}

  <div class="sezione"><GiocatoriStanza {stanza} /></div>

  {#if stanza.eHost}
    <button type="button" class="btn btn-primario in-fondo" disabled={avviando} onclick={() => avvia(() => stanza.iniziaPartita())}>
      {avviando ? 'Preparo la griglia…' : 'Inizia la partita'}
    </button>
  {/if}
{:else if stanza.fase === 'gioco' && stanza.mano}
  {#key stanza.mano.n}
    <Mano
      griglia={stanza.mano.griglia}
      fineAlle={stanza.fineLocale}
      durata={stanza.mano.fine - stanza.mano.inizio}
      minLettere={stanza.mano.minLettere}
      intestazione={`Mano ${stanza.mano.n} · ${stanza.numeroOnline} giocatori`}
      trovate={stanza.mieParole}
      verifica={(p) => stanza.proponi(p)}
      onfine={() => {}}
      inAttesa={stanza.eHost ? numeroRichieste : 0}
    />
  {/key}
{:else if stanza.fase === 'spettatore'}
  {@render testata(stanza.codice, `Mano ${stanza.mano?.n} in corso`, true)}
  <div class="messaggio-pieno">
    <div class="display grande">{orologio(secondi((stanza.mano?.fine ?? 0) - stanza.adesso))}</div>
    <p>Sei entrato a mano iniziata: giochi dalla prossima.</p>
  </div>
{:else if stanza.fase === 'conto' && (!stanza.risultati || stanza.risultati.n === 0)}
  <div class="messaggio-pieno">
    <p class="muted">Si comincia tra</p>
    <div class="display conto">{alInizio}</div>
  </div>
{:else}
  {@render testata(
    stanza.fase === 'finita' ? 'Partita finita' : `Fine mano ${stanza.risultati?.n ?? ''}`,
    stanza.fase === 'conto'
      ? `Prossima mano tra ${orologio(alInizio)}`
      : stanza.fase === 'finita'
        ? 'Nessuno con l\'app può preparare altre griglie'
        : stanza.impostazioni.automatico && !inPausa
          ? 'Prossima mano in preparazione…'
          : stanza.eHost && inPausa
            ? 'Fai entrare chi aspetta, poi riparti'
            : stanza.eHost
            ? 'Avvia la prossima mano quando volete'
            : `Aspetta che ${nomeHost} avvii la prossima mano`,
    true,
  )}
  {@render strumentiHost()}
  {#if stanza.risultati}
    <div class="sezione"><RisultatiMano {stanza} risultati={stanza.risultati} /></div>
  {/if}
  {#if stanza.eHost && stanza.fase === 'risultati' && (!stanza.impostazioni.automatico || inPausa)}
    <button
      type="button"
      class="btn btn-primario in-fondo"
      disabled={avviando || !stanza.risultati?.dati}
      onclick={() => avvia(() => stanza.prossimaMano())}
    >
      {avviando ? 'Preparo la griglia…' : 'Prossima mano'}
    </button>
  {/if}
{/if}

{#if avviso}
  <div class="avviso" role="status">{avviso}</div>
{/if}

<style>
  .testa {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .titoli {
    flex: 1;
    min-width: 0;
  }

  .titolo {
    font-size: 30px;
    letter-spacing: 0.06em;
    line-height: 1.1;
  }

  .titolo.compatta {
    font-size: 24px;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .piccolo {
    font-size: 13px;
  }

  .sezione {
    margin-top: 18px;
  }

  .qr-scheda {
    margin-top: 16px;
    display: flex;
    gap: 14px;
    align-items: center;
  }

  .qr-testo {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .link {
    font-weight: 600;
    word-break: break-all;
  }

  .in-fondo {
    margin-top: auto;
    position: sticky;
    bottom: 0;
  }

  .sezione + .in-fondo {
    margin-top: 24px;
  }

  .strumenti {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .strumenti .btn {
    padding: 0 6px;
    font-size: 14px;
    gap: 6px;
  }

  .badge {
    background: var(--warm-bg);
    color: var(--on-warm);
    font-size: 12px;
    font-weight: 700;
    border-radius: 10px;
    padding: 1px 7px;
  }

  .pericolo {
    color: var(--danger);
  }

  .pannello {
    margin-top: 12px;
    padding: 12px;
    border-radius: 16px;
    border: 1px solid var(--line);
  }

  .centro {
    margin: auto;
  }

  .messaggio-pieno {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
  }

  .messaggio-pieno p {
    margin: 0;
    max-width: 30ch;
    line-height: 1.5;
  }

  .grande {
    font-size: 30px;
  }

  .conto {
    font-size: 120px;
    line-height: 1;
    color: var(--acc);
  }

  .attesa {
    display: flex;
    gap: 8px;
    margin: 8px 0 16px;
  }

  .attesa span {
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: var(--acc);
    animation: pulsa 1.2s infinite ease-in-out;
  }

  .attesa span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .attesa span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulsa {
    0%,
    100% {
      opacity: 0.25;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .avviso {
    position: fixed;
    left: 50%;
    bottom: 32px;
    transform: translateX(-50%);
    background: var(--text);
    color: var(--bg);
    padding: 10px 18px;
    border-radius: 20px;
    font-weight: 600;
  }
</style>
