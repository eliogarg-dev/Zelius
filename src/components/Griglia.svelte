<script lang="ts">
  // Griglia di gioco: si compone la parola trascinando il dito (o il mouse) sulle lettere.
  import { etichettaCasella } from '../lib/game/alfabeto.ts';
  import { adiacenze, latoDi } from '../lib/game/risolutore.ts';

  let {
    griglia,
    attiva = true,
    percorso = $bindable([]),
    evidenzia = [],
    onparola,
  }: {
    griglia: number[];
    attiva?: boolean;
    /** Caselle toccate finora, nell'ordine. */
    percorso?: number[];
    /** Percorso da mostrare a griglia ferma (es. nei risultati). */
    evidenzia?: number[];
    onparola?: (simboli: number[], percorso: number[]) => void;
  } = $props();

  const lato = $derived(latoDi(griglia));
  const vicini = $derived(adiacenze(lato));
  const caselle: HTMLElement[] = [];
  let trascinando = false;

  const mostrato = $derived(percorso.length > 0 ? percorso : evidenzia);
  const punti = $derived(mostrato.map((c) => `${(c % lato) + 0.5},${Math.floor(c / lato) + 0.5}`).join(' '));

  /** Casella sotto il dito: conta solo la parte centrale, così le diagonali sono facili. */
  function casellaSotto(x: number, y: number): number {
    for (let i = 0; i < caselle.length; i++) {
      const r = caselle[i]?.getBoundingClientRect();
      if (!r) continue;
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.42) return i;
    }
    return -1;
  }

  function inizia(e: PointerEvent) {
    if (!attiva) return;
    const c = casellaSotto(e.clientX, e.clientY);
    if (c < 0) return;
    trascinando = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    percorso = [c];
  }

  function muovi(e: PointerEvent) {
    if (!trascinando) return;
    const c = casellaSotto(e.clientX, e.clientY);
    const ultima = percorso[percorso.length - 1];
    if (c < 0 || c === ultima) return;
    if (percorso.length > 1 && c === percorso[percorso.length - 2]) {
      percorso = percorso.slice(0, -1); // tornando indietro si cancella l'ultima lettera
    } else if (!percorso.includes(c) && vicini[ultima].includes(c)) {
      percorso = [...percorso, c];
    }
  }

  function termina() {
    if (!trascinando) return;
    trascinando = false;
    const p = percorso;
    percorso = [];
    if (p.length > 0) onparola?.(p.map((c) => griglia[c]), p);
  }
</script>

<div
  class="cornice"
  class:attiva
  role="img"
  aria-label={`Griglia ${lato} per ${lato}: ${griglia.map(etichettaCasella).join(' ')}`}
  onpointerdown={inizia}
  onpointermove={muovi}
  onpointerup={termina}
  onpointercancel={termina}
>
  <div class="griglia" style:--lato={lato}>
    {#each griglia as simbolo, i (i)}
      <div class="casella display quadrata" class:scelta={mostrato.includes(i)} bind:this={caselle[i]}>
        {etichettaCasella(simbolo)}
      </div>
    {/each}
    {#if mostrato.length > 1}
      <svg class="traccia" viewBox={`0 0 ${lato} ${lato}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline points={punti} />
      </svg>
    {/if}
  </div>
</div>

<style>
  .cornice {
    --spazio: 10px;
    padding: calc(var(--spazio) / 2);
    border-radius: 22px;
    background: var(--surf);
    border: 1px solid var(--line);
    user-select: none;
    -webkit-user-select: none;
  }

  .cornice.attiva {
    touch-action: none;
  }

  /* Ogni casella occupa esattamente 1/lato della griglia (margini compresi),
     così i centri coincidono con le coordinate della traccia SVG. */
  .griglia {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--lato), minmax(0, 1fr));
  }

  .casella {
    margin: calc(var(--spazio) / 2);
    border-radius: 16px;
    background: var(--surf2);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(128px / var(--lato));
    transition: background-color 80ms, color 80ms;
  }

  .casella.scelta {
    background: var(--acc);
    color: var(--on-acc);
  }

  .traccia {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .traccia polyline {
    fill: none;
    stroke: var(--path);
    stroke-opacity: 0.8;
    stroke-width: 0.09;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
