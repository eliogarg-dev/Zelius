<script lang="ts">
  // Fine mano: Classifica e Parole su due tab separati.
  import { inSimboli, numeroLettere } from '../lib/game/alfabeto.ts';
  import { punti } from '../lib/game/punteggio.ts';
  import { trovaPercorso } from '../lib/game/risolutore.ts';
  import { elencoNomi } from '../lib/stanza/logica.ts';
  import type { RisultatiVisti, Stanza } from '../lib/stanza/stanza.svelte.ts';
  import ElencoParole, { type VoceParola } from './ElencoParole.svelte';
  import Griglia from './Griglia.svelte';

  let { stanza, risultati }: { stanza: Stanza; risultati: RisultatiVisti } = $props();

  let tab: 'classifica' | 'parole' = $state('classifica');
  let selezionata: string | null = $state(null);

  const nomeDi = (uid: string) => (uid === stanza.uid ? 'Tu' : (stanza.giocatori[uid]?.nome ?? 'Giocatore uscito'));

  const classifica = $derived.by(() => {
    const d = risultati.dati;
    if (!d) return [];
    return Object.entries(d.totali)
      .map(([uid, totale]) => ({ uid, totale, mano: d.punti?.[uid] ?? 0, nome: nomeDi(uid) }))
      .sort((a, b) => b.totale - a.totale || b.mano - a.mano || a.nome.localeCompare(b.nome));
  });
  const posizione = $derived(classifica.findIndex((r) => r.uid === stanza.uid));
  const mia = $derived(classifica[posizione]);

  const voci: VoceParola[] = $derived.by(() => {
    const trovate = risultati.dati?.trovate ?? {};
    const valore = (parola: string) => {
      const s = inSimboli(parola);
      return s ? punti(parola, numeroLettere(s)) : 0;
    };
    const dalleSoluzioni = risultati.soluzioni ?? Object.keys(trovate);
    return dalleSoluzioni
      .map((parola) => {
        const chi = (trovate[parola] ?? '').split(' ').filter(Boolean);
        const mia = chi.includes(stanza.uid);
        const nomi = [...(mia ? ['Tu'] : []), ...chi.filter((u) => u !== stanza.uid).map(nomeDi)];
        return {
          parola,
          punti: valore(parola),
          mia,
          mancata: chi.length === 0,
          dettaglio: chi.length ? `Trovata da ${elencoNomi(nomi)}` : 'Solo il computer',
        };
      })
      .sort((a, b) => Number(a.mancata) - Number(b.mancata) || b.punti - a.punti || a.parola.localeCompare(b.parola));
  });

  const massimo = $derived(voci.reduce((s, v) => s + v.punti, 0));
  const evidenzia = $derived.by(() => {
    if (!selezionata || risultati.griglia.length === 0) return [];
    const s = inSimboli(selezionata);
    return s ? (trovaPercorso(s, risultati.griglia) ?? []) : [];
  });

  let segnalazione = $state('');
  let segnalata = $state(false);
  let apriSegnala = $state(false);
  async function invia(e: SubmitEvent) {
    e.preventDefault();
    if (!segnalazione.trim()) return;
    await stanza.segnala(segnalazione).catch(() => {});
    segnalata = true;
    segnalazione = '';
    apriSegnala = false;
  }
</script>

<div class="tab" role="tablist">
  <button type="button" role="tab" aria-selected={tab === 'classifica'} onclick={() => (tab = 'classifica')}>Classifica</button>
  <button type="button" role="tab" aria-selected={tab === 'parole'} onclick={() => (tab = 'parole')}>Parole</button>
</div>

{#if !risultati.dati}
  <p class="muted attesa">Calcolo i risultati…</p>
{:else if tab === 'classifica'}
  {#if mia}
    <div class="scheda posizione">
      <div>
        <div class="muted piccolo">La tua posizione</div>
        <div class="display grande">{posizione + 1}° su {classifica.length}</div>
      </div>
      <div class="destra">
        <div class="display medio">{mia.totale} punti</div>
        <div class="caldo piccolo">+{mia.mano} in questa mano</div>
      </div>
    </div>
  {/if}
  <ol class="classifica">
    {#each classifica as r, i (r.uid)}
      <li class:io={r.uid === stanza.uid}>
        <span class="pos muted">{i + 1}°</span>
        <span class="avatar display">{r.uid === stanza.uid ? 'Tu' : r.nome[0]?.toUpperCase()}</span>
        <span class="nome">{r.nome}</span>
        <span class="caldo mano">+{r.mano}</span>
        <span class="display totale">{r.totale}</span>
      </li>
    {/each}
  </ol>
{:else}
  <p class="muted piccolo riassunto">
    {voci.length} parole possibili · massimo {massimo} punti · trovate {Object.keys(risultati.dati.trovate ?? {}).length}
  </p>
  {#if risultati.griglia.length}
    <div class="mini-griglia">
      <Griglia griglia={risultati.griglia} attiva={false} {evidenzia} />
    </div>
  {/if}
  <ElencoParole {voci} etichettaTua {selezionata} onseleziona={(p) => (selezionata = selezionata === p ? null : p)} />

  <div class="segnala">
    {#if segnalata}
      <p class="muted piccolo">Grazie, segnalazione inviata.</p>
    {/if}
    {#if apriSegnala}
      <form onsubmit={invia}>
        <label class="solo-lettori" for="segnala">Parola mancante</label>
        <input id="segnala" class="campo" bind:value={segnalazione} placeholder="Parola mancante" autocomplete="off" />
        <button type="submit" class="btn">Invia</button>
      </form>
    {:else}
      <button type="button" class="btn-testo muted-link" onclick={() => (apriSegnala = true)}>Segnala una parola mancante</button>
    {/if}
  </div>
{/if}

<style>
  .tab {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 24px;
    background: var(--surf2);
  }

  .tab button {
    min-height: 44px;
    border: 0;
    border-radius: 20px;
    background: transparent;
    color: var(--muted);
    font-weight: 600;
    font-size: 15px;
  }

  .tab button[aria-selected='true'] {
    background: var(--surf);
    color: var(--text);
  }

  .attesa {
    text-align: center;
    margin-top: 24px;
  }

  .posizione {
    margin-top: 14px;
    border: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .destra {
    text-align: right;
  }

  .piccolo {
    font-size: 13px;
  }

  .grande {
    font-size: 26px;
  }

  .medio {
    font-size: 22px;
  }

  .caldo {
    color: var(--warm);
    font-weight: 600;
  }

  .classifica {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .classifica li {
    background: var(--surf);
    border-radius: 12px;
    padding: 7px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
  }

  .classifica li.io {
    background: var(--me);
  }

  .pos {
    width: 28px;
    font-weight: 600;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 15px;
    background: var(--surf2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    flex-shrink: 0;
  }

  .nome {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mano {
    font-size: 14px;
  }

  .totale {
    min-width: 34px;
    text-align: right;
    font-size: 17px;
  }

  .riassunto {
    margin: 14px 0 10px;
  }

  /* Arrivata in cima la griglia resta ferma e scorrono solo le parole.
     Sfondo a tutta larghezza (oltre il padding di #app) per coprirle. */
  .mini-griglia {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: 0 -20px 12px;
    padding: max(8px, env(safe-area-inset-top)) calc(20% + 20px) 8px;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
  }

  .segnala {
    margin-top: 16px;
    text-align: center;
  }

  .segnala form {
    display: flex;
    gap: 8px;
  }

  .muted-link {
    color: var(--muted);
    text-decoration: underline;
    font-weight: 500;
  }
</style>
