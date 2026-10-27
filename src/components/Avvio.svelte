<script lang="ts">
  // Animazione all'apertura dell'app: i dadi si mescolano, si traccia ZELIUS e le sue caselle
  // volano al loro posto nel logo della Home. Un tocco la salta.
  import { onMount } from 'svelte';

  let { bersagli, onfine }: { bersagli: () => HTMLElement[]; onfine: () => void } = $props();

  const LETTERE = [...'ZERATLONCIUMAPES'];
  const PERCORSO = [0, 1, 5, 9, 10, 15]; // Z E L I U S, caselle adiacenti
  const CASUALI = 'ABCDEFGILMNOPRSTUVZ';
  const centri = PERCORSO.map((c) => [(c % 4) + 0.5, Math.floor(c / 4) + 0.5]);
  const casuale = () => CASUALI[Math.floor(Math.random() * CASUALI.length)];
  const onda = (i: number) => (i % 4) + Math.floor(i / 4);

  let lettere = $state(LETTERE.map(casuale));
  let accese = $state(0);
  let sciolta = $state(false);
  const caselle: HTMLElement[] = [];
  let linea: SVGPolylineElement;
  const timer: number[] = []; // id di setTimeout e setInterval: clearTimeout li ferma entrambi
  let finito = false;

  const dopo = (ms: number) => new Promise<void>((r) => timer.push(window.setTimeout(r, ms)));

  function fine() {
    if (finito) return;
    finito = true;
    timer.forEach((t) => clearTimeout(t));
    onfine();
  }

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) fine();
    else anima().then(fine);
    return () => timer.forEach((t) => clearTimeout(t));
  });

  async function anima() {
    // 1. Le caselle compaiono a onda dall'angolo e le lettere girano a caso prima di fermarsi.
    caselle.forEach((c, i) =>
      c.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], {
        duration: 320,
        delay: onda(i) * 45,
        easing: 'cubic-bezier(.2,.9,.3,1.3)',
        fill: 'backwards',
      }),
    );
    const t0 = performance.now();
    timer.push(
      window.setInterval(() => {
        const t = performance.now() - t0;
        lettere = LETTERE.map((l, i) => (t < 380 + onda(i) * 60 ? casuale() : l));
      }, 60),
    );
    await dopo(800);
    lettere = LETTERE;

    // 2. La traccia passa da Z a S e accende ogni casella quando la raggiunge.
    const DURATA = 750;
    const tappe = centri.map((p, n) => (n ? Math.hypot(p[0] - centri[n - 1][0], p[1] - centri[n - 1][1]) : 0));
    const arrivi = tappe.map((_, n) => tappe.slice(0, n + 1).reduce((a, b) => a + b, 0));
    const totale = arrivi[arrivi.length - 1];
    linea.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: DURATA, fill: 'forwards' });
    arrivi.forEach((a, n) =>
      timer.push(
        window.setTimeout(() => {
          accese = n + 1;
          caselle[PERCORSO[n]].animate([{ transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
        }, (a / totale) * DURATA),
      ),
    );
    await dopo(DURATA + 350);

    // 3. Il tabellone si scioglie e le sei caselle volano nel logo.
    sciolta = true;
    await dopo(150);
    const da = PERCORSO.map((c) => caselle[c].getBoundingClientRect());
    const voli = bersagli().map((b, n) => {
      const a = b.getBoundingClientRect();
      const stile = getComputedStyle(b);
      const el = caselle[PERCORSO[n]];
      const corrente = getComputedStyle(el);
      const r = da[n];
      Object.assign(el.style, { position: 'fixed', margin: '0', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      return el.animate(
        [
          { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, fontSize: corrente.fontSize, borderRadius: corrente.borderRadius },
          { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, fontSize: stile.fontSize, borderRadius: stile.borderRadius },
        ],
        { duration: 560, delay: n * 40, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      ).finished;
    });
    await Promise.all(voli);
  }
</script>

<button type="button" class="avvio" aria-label="Salta l'animazione" onclick={fine}>
  <span class="cornice" class:sciolta>
    <span class="griglia">
      {#each lettere as l, i (i)}
        <span
          class="casella display quadrata"
          class:percorso={PERCORSO.includes(i)}
          class:accesa={PERCORSO.indexOf(i) >= 0 && PERCORSO.indexOf(i) < accese}
          bind:this={caselle[i]}>{l}</span
        >
      {/each}
      <svg class="traccia" viewBox="0 0 4 4" preserveAspectRatio="none" aria-hidden="true">
        <polyline bind:this={linea} points={centri.join(' ')} pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" />
      </svg>
    </span>
  </span>
</button>

<style>
  .avvio {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border: 0;
    background: transparent;
    cursor: default;
  }

  /* Stessa geometria di Griglia.svelte */
  .cornice {
    --spazio: 10px;
    display: block;
    width: 100%;
    max-width: 320px;
    padding: calc(var(--spazio) / 2);
    border-radius: 22px;
    background: var(--surf);
    border: 1px solid var(--line);
    transition: background-color 300ms, border-color 300ms;
  }

  .griglia {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .casella {
    margin: calc(var(--spazio) / 2);
    border-radius: 16px;
    background: var(--surf2);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    transition: background-color 80ms, color 80ms, opacity 220ms, transform 220ms;
  }

  .casella.accesa {
    background: var(--acc);
    color: var(--on-acc);
  }

  .traccia {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    transition: opacity 200ms;
  }

  .traccia polyline {
    fill: none;
    stroke: var(--path);
    stroke-opacity: 0.8;
    stroke-width: 0.09;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sciolta {
    background-color: transparent;
    border-color: transparent;
  }

  .sciolta .casella:not(.percorso) {
    opacity: 0;
    transform: scale(0.7);
  }

  .sciolta .traccia {
    opacity: 0;
  }
</style>
