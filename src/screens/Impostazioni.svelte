<script lang="ts">
  import Icona from '../components/Icona.svelte';
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

  <div class="scheda crediti">
    <div class="etichetta">Dizionario</div>
    <p>
      Le parole vengono da <strong>Morph-it!</strong> di Marco Baroni ed Eros Zanchetta (Università di Bologna),
      con licenza CC BY-SA 2.0 e LGPL.
    </p>
  </div>
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

  .crediti p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--soft);
  }
</style>
