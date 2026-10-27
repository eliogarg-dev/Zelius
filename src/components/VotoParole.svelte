<script lang="ts">
  // Fine mano con il voto attivo: ognuno mette ai voti fino a due parole scartate e gli altri dicono sì o no.
  // Una parola vale se dicono sì tutti i giocatori della mano ancora online; si vota fino alla mano successiva.
  import { inSimboli, numeroLettere } from '../lib/game/alfabeto.ts';
  import { punti } from '../lib/game/punteggio.ts';
  import { elencoNomi, esitoVoto, MAX_PROPOSTE, proponentiPerParola } from '../lib/stanza/logica.ts';
  import type { RisultatiVisti, Stanza } from '../lib/stanza/stanza.svelte.ts';

  let { stanza, risultati }: { stanza: Stanza; risultati: RisultatiVisti } = $props();

  const nomeDi = (uid: string) => (uid === stanza.uid ? 'Tu' : (stanza.giocatori[uid]?.nome ?? 'Giocatore uscito'));
  const valore = (parola: string) => {
    const s = inSimboli(parola);
    return s ? punti(parola, numeroLettere(s)) : 0;
  };

  const mie = $derived(risultati.proposte[stanza.uid] ?? []);
  const libere = $derived(MAX_PROPOSTE - mie.length);
  const candidate = $derived(
    libere > 0 && stanza.scartate.n === risultati.n ? stanza.scartate.parole.filter((p) => !mie.includes(p)) : [],
  );
  const elettori = $derived(
    Object.entries(stanza.giocatori)
      .filter(([, g]) => g.online && g.entrato <= risultati.inizio)
      .map(([uid]) => uid),
  );
  const voci = $derived(
    [...proponentiPerParola(risultati.proposte)].map(([parola, proponenti]) => {
      const { stato, mancano } = esitoVoto(risultati.voti[parola] ?? {}, proponenti, elettori);
      const esito = risultati.esiti[parola];
      return {
        parola,
        chi: elencoNomi(proponenti.map(nomeDi)),
        punti: valore(parola),
        valida: esito === true,
        scartata: esito === false || stato === 'rifiutata',
        devoVotare: mancano.includes(stanza.uid),
        mancano: mancano.map(nomeDi),
      };
    }),
  );

  let inviando = $state(false);
  async function esegui(azione: () => Promise<void>) {
    inviando = true;
    try {
      await azione();
    } catch (e) {
      console.error(e);
    } finally {
      inviando = false;
    }
  }
</script>

{#if voci.length || candidate.length}
  <section class="scheda voto" aria-labelledby="titolo-voto">
    <div class="testa">
      <h2 id="titolo-voto" class="display">Parole ai voti</h2>
      <span class="muted piccolo">Si vota fino alla prossima mano</span>
    </div>

    {#if candidate.length}
      <p class="muted piccolo spiega">
        Tocca una tua parola scartata per farla votare ({libere === 1 ? 'ancora una' : `fino a ${libere}`}):
      </p>
      <div class="candidate">
        {#each candidate as parola (parola)}
          <button type="button" class="btn chip" disabled={inviando} onclick={() => esegui(() => stanza.proponiAlVoto(parola))}>
            {parola}
          </button>
        {/each}
      </div>
    {/if}

    {#if voci.length}
      <ul class="elenco">
        {#each voci as v (v.parola)}
          <li>
            <div class="parola">
              <span class="display">{v.parola}</span>
              <span class="muted piccolo">{v.chi} · {v.punti} {v.punti === 1 ? 'punto' : 'punti'}</span>
            </div>
            {#if v.valida}
              <span class="esito ok">Valida</span>
            {:else if v.scartata}
              <span class="esito no">Scartata</span>
            {:else if v.devoVotare}
              <div class="scelte">
                <button type="button" class="btn" disabled={inviando} aria-label={`Sì, ${v.parola} è valida`} onclick={() => esegui(() => stanza.vota(v.parola, true))}>Sì</button>
                <button type="button" class="btn" disabled={inviando} aria-label={`No, ${v.parola} non è valida`} onclick={() => esegui(() => stanza.vota(v.parola, false))}>No</button>
              </div>
            {:else}
              <span class="muted piccolo attesa">{v.mancano.length ? `Aspetta ${elencoNomi(v.mancano)}` : 'Quasi fatto…'}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .voto {
    margin-bottom: 14px;
    border: 1px solid var(--line);
  }

  .testa {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  .piccolo {
    font-size: 13px;
  }

  .spiega {
    margin: 10px 0 8px;
  }

  .candidate {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    min-height: 36px;
    padding: 0 14px;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 700;
  }

  .elenco {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .elenco li {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .parola {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .parola .piccolo {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .scelte {
    display: flex;
    gap: 6px;
  }

  .scelte .btn {
    min-width: 52px;
    padding: 0 12px;
  }

  .esito {
    font-weight: 700;
    font-size: 14px;
  }

  .ok {
    color: var(--ok);
  }

  .no {
    color: var(--danger);
  }

  .attesa {
    text-align: right;
    max-width: 45%;
  }
</style>
