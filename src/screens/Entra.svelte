<script lang="ts">
  // Nickname (e codice, se si entra) prima di creare o raggiungere una stanza.
  import Icona from '../components/Icona.svelte';
  import { eApp } from '../lib/piattaforma.ts';
  import { leggiCodice } from '../lib/stanza/logica.ts';
  import { preferenze, salvaPreferenze } from '../lib/preferenze.svelte.ts';

  let {
    modo,
    codiceIniziale = '',
    errore = '',
    occupato = false,
    onconferma,
    onindietro,
  }: {
    modo: 'crea' | 'entra';
    codiceIniziale?: string;
    errore?: string;
    occupato?: boolean;
    onconferma: (nome: string, codice: string) => void;
    onindietro?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let codice = $state(codiceIniziale);
  let erroreLocale = $state('');
  const codiceFisso = $derived(codiceIniziale.length > 0);

  function conferma(e: SubmitEvent) {
    e.preventDefault();
    erroreLocale = '';
    const nome = preferenze.nickname.trim();
    if (!nome) {
      erroreLocale = 'Scegli un nickname.';
      return;
    }
    salvaPreferenze();
    if (modo === 'crea') return onconferma(nome, '');
    const c = leggiCodice(codice);
    if (!c) {
      erroreLocale = 'Il codice ha 4 caratteri, per esempio K74Q.';
      return;
    }
    onconferma(nome, c);
  }

  async function inquadra() {
    erroreLocale = '';
    try {
      const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import('@capacitor/barcode-scanner');
      const { ScanResult } = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Inquadra il QR code della stanza',
      });
      const c = leggiCodice(ScanResult);
      if (c) codice = c;
      else erroreLocale = 'Questo QR code non è di una stanza di Zapp.';
    } catch {
      // Scansione annullata o fotocamera negata.
    }
  }
</script>

<div class="testa">
  {#if onindietro}
    <button type="button" class="btn-icona" aria-label="Indietro" onclick={onindietro}><Icona nome="indietro" /></button>
  {/if}
  <h1 class="display">{modo === 'crea' ? 'Crea una stanza' : codiceFisso ? `Stanza ${codiceIniziale}` : 'Entra in una stanza'}</h1>
</div>

<form class="modulo" onsubmit={conferma}>
  {#if modo === 'entra' && !codiceFisso}
    <div>
      <label class="etichetta" for="codice">Codice della stanza</label>
      <input
        id="codice"
        class="campo codice display"
        bind:value={codice}
        maxlength="4"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="K74Q"
      />
      {#if eApp}
        <button type="button" class="btn qr" onclick={inquadra}>Inquadra il QR code</button>
      {/if}
    </div>
  {/if}
  <div>
    <label class="etichetta" for="nome">Il tuo nickname</label>
    <input id="nome" class="campo" bind:value={preferenze.nickname} maxlength="20" autocomplete="nickname" placeholder="Come ti chiami?" />
  </div>

  {#if erroreLocale || errore}
    <p class="errore" role="alert">{erroreLocale || errore}</p>
  {/if}

  <button type="submit" class="btn btn-primario invia" disabled={occupato}>
    {occupato ? 'Un momento…' : modo === 'crea' ? 'Crea la stanza' : 'Chiedi di entrare'}
  </button>
</form>

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

  .modulo {
    flex: 1;
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  label.etichetta {
    display: block;
  }

  .codice {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 24px;
  }

  .qr {
    margin-top: 10px;
    width: 100%;
  }

  .errore {
    margin: 0;
    color: var(--danger);
    font-weight: 600;
  }

  .invia {
    margin-top: auto;
  }
</style>
