<script lang="ts">
  import Icona from '../components/Icona.svelte';
  import { conferma } from '../lib/conferma.ts';
  import { paroleAggiunte, togliParola } from '../lib/paroleAggiunte.svelte.ts';
  import { preferenze, salvaPreferenze, type Tema } from '../lib/preferenze.svelte.ts';

  let { onesci, onTema }: { onesci: () => void; onTema: () => void } = $props();

  const temi: [Tema, string][] = [
    ['auto', 'Automatico'],
    ['chiaro', 'Chiaro'],
    ['scuro', 'Scuro'],
  ];

  function scegliTema(t: Tema) {
    preferenze.tema = t;
    salvaPreferenze();
    onTema();
  }

  async function togli(parola: string) {
    if (await conferma(`Togliere ${parola} dalle parole aggiunte?`, 'Togli')) togliParola(parola);
  }
</script>

<div class="testa">
  <button type="button" class="btn-icona" aria-label="Indietro" onclick={onesci}><Icona nome="indietro" /></button>
  <h1 class="display">Impostazioni</h1>
</div>

<div class="sezioni">
  <div>
    <label class="etichetta" for="nickname">Nickname</label>
    <input
      id="nickname"
      class="campo"
      maxlength="20"
      autocomplete="nickname"
      placeholder="Come ti chiami?"
      bind:value={preferenze.nickname}
      onchange={salvaPreferenze}
    />
  </div>

  <div>
    <div class="etichetta">Tema</div>
    <div class="segmenti">
      {#each temi as [id, testo] (id)}
        <button type="button" aria-pressed={preferenze.tema === id} onclick={() => scegliTema(id)}>{testo}</button>
      {/each}
    </div>
    <p class="muted nota">Automatico segue il tema del telefono.</p>
  </div>

  {#if paroleAggiunte.length}
    <div>
      <div class="etichetta">Parole aggiunte ({paroleAggiunte.length})</div>
      <ul class="aggiunte">
        {#each paroleAggiunte as parola (parola)}
          <li>
            <span class="display">{parola}</span>
            <button type="button" class="togli" aria-label={`Togli ${parola}`} onclick={() => togli(parola)}><Icona nome="chiudi" /></button>
          </li>
        {/each}
      </ul>
      <p class="muted nota">Approvate da tutti nelle tue stanze: valgono nelle griglie preparate da questo telefono.</p>
    </div>
  {/if}

  <details class="licenze muted">
    <summary>Licenze e fonti</summary>
    <p>
      Dizionario Zelius, licenza CC BY-SA 4.0. Costruito da: Morph-it! di M. Baroni ed E. Zanchetta
      (Univ. di Bologna, CC BY-SA 2.0); Wikizionario e Wiktionary inglese (CC BY-SA); paroleitaliane di Napolux
      (MIT; coniugazioni da verb-data, CC BY-SA 3.0).
    </p>
  </details>
</div>

<style>
  .testa {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 28px;
  }

  .sezioni {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  label.etichetta {
    display: block;
  }

  .nota {
    font-size: 14px;
    margin: 8px 0 0;
  }

  .aggiunte {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .aggiunte li {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-left: 12px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: var(--surf);
  }

  .togli {
    width: 36px;
    height: 36px;
    padding: 8px;
    border: 0;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .licenze {
    font-size: 13px;
    line-height: 1.5;
  }

  .licenze summary {
    cursor: pointer;
  }

  .licenze p {
    margin: 8px 0 0;
  }
</style>
