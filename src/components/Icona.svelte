<script lang="ts">
  type Nome = 'sole' | 'luna' | 'condividi' | 'tastiera' | 'blocca' | 'chiudi' | 'indietro' | 'impostazioni' | 'invia';
  let { nome, dimensione = 18 }: { nome: Nome; dimensione?: number } = $props();
</script>

<svg
  aria-hidden="true"
  width={dimensione}
  height={dimensione}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if nome === 'sole'}
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  {:else if nome === 'luna'}
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  {:else if nome === 'condividi'}
    <path d="M4 12v8h16v-8" /><path d="M12 3v13" /><path d="M7 8l5-5 5 5" />
  {:else if nome === 'tastiera'}
    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  {:else if nome === 'blocca'}
    <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
  {:else if nome === 'chiudi'}
    <path d="M6 6l12 12M18 6L6 18" />
  {:else if nome === 'indietro'}
    <path d="M15 18l-6-6 6-6" />
  {:else if nome === 'impostazioni'}
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  {:else if nome === 'invia'}
    <path d="M5 12h14M13 6l6 6-6 6" />
  {/if}
</svg>
