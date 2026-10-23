import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: {
      plugins: [
        // Svelte 5 scrive `.a .b:where(.svelte-x)`: i browser senza :where() (Chrome < 88)
        // scartano l'intera regola. `.svelte-x` semplice funziona ovunque.
        {
          postcssPlugin: 'senza-where',
          Rule(rule: { selector: string }) {
            rule.selector = rule.selector.replace(/:where\((\.svelte-[\w-]+)\)/g, '$1');
          },
        },
      ],
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
