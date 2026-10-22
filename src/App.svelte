<script lang="ts">
  import { firebaseDisponibile } from './lib/firebase.ts';
  import { codiceDaIndirizzo, eApp } from './lib/piattaforma.ts';
  import { applicaTema } from './lib/preferenze.svelte.ts';
  import { Stanza } from './lib/stanza/stanza.svelte.ts';
  import Allenamento from './screens/Allenamento.svelte';
  import Entra from './screens/Entra.svelte';
  import Home from './screens/Home.svelte';
  import Impostazioni from './screens/Impostazioni.svelte';
  import StanzaSchermata from './screens/StanzaSchermata.svelte';

  type Schermata = 'home' | 'allenamento' | 'impostazioni' | 'crea' | 'entra' | 'stanza';

  const codiceLink = codiceDaIndirizzo();
  let schermata: Schermata = $state(codiceLink ? 'entra' : 'home');
  let stanza: Stanza | null = $state(null);
  let errore = $state('');
  let occupato = $state(false);

  const aggiornaTema = applicaTema();

  async function apriStanza(azione: () => Promise<Stanza>) {
    errore = '';
    occupato = true;
    try {
      stanza = await azione();
      schermata = 'stanza';
    } catch (e) {
      console.error(e);
      errore = 'Non riesco a collegarmi. Controlla la connessione e riprova.';
    } finally {
      occupato = false;
    }
  }

  async function esciDallaStanza() {
    await stanza?.esci();
    stanza = null;
    schermata = 'home';
    if (codiceLink) history.replaceState(null, '', '/');
  }
</script>

{#if schermata === 'home'}
  <Home
    {eApp}
    stanzeDisponibili={firebaseDisponibile}
    onallenati={() => (schermata = 'allenamento')}
    oncrea={() => (schermata = 'crea')}
    onentra={() => (schermata = 'entra')}
    onimpostazioni={() => (schermata = 'impostazioni')}
  />
{:else if schermata === 'allenamento'}
  <Allenamento onesci={() => (schermata = 'home')} />
{:else if schermata === 'impostazioni'}
  <Impostazioni onesci={() => (schermata = 'home')} onTema={aggiornaTema} />
{:else if schermata === 'crea'}
  <Entra
    modo="crea"
    {errore}
    {occupato}
    onindietro={() => (schermata = 'home')}
    onconferma={(nome) => apriStanza(() => Stanza.crea(nome))}
  />
{:else if schermata === 'entra'}
  <Entra
    modo="entra"
    codiceIniziale={codiceLink ?? ''}
    {errore}
    {occupato}
    onindietro={codiceLink ? undefined : () => (schermata = 'home')}
    onconferma={(nome, codice) => apriStanza(() => Stanza.entra(codice, nome))}
  />
{:else if schermata === 'stanza' && stanza}
  <StanzaSchermata {stanza} onesci={esciDallaStanza} />
{/if}
