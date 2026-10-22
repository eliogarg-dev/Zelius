<script lang="ts">
  import { applicaTema } from './lib/preferenze.svelte.ts';
  import Allenamento from './screens/Allenamento.svelte';
  import Home from './screens/Home.svelte';
  import Impostazioni from './screens/Impostazioni.svelte';

  type Schermata = 'home' | 'allenamento' | 'impostazioni';
  let schermata: Schermata = $state('home');

  const aggiornaTema = applicaTema();
</script>

{#if schermata === 'home'}
  <Home
    stanzeDisponibili={false}
    onallenati={() => (schermata = 'allenamento')}
    oncrea={() => {}}
    onentra={() => {}}
    onimpostazioni={() => (schermata = 'impostazioni')}
  />
{:else if schermata === 'allenamento'}
  <Allenamento onesci={() => (schermata = 'home')} />
{:else}
  <Impostazioni onesci={() => (schermata = 'home')} onTema={aggiornaTema} />
{/if}
