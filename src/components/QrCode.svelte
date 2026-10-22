<script lang="ts">
  import qrcode from 'qrcode-generator';

  let { testo, dimensione = 96 }: { testo: string; dimensione?: number } = $props();

  // Il QR è generato qui dal nostro link: il markup SVG non contiene dati esterni.
  const svg = $derived.by(() => {
    const qr = qrcode(0, 'M');
    qr.addData(testo);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });
</script>

<div class="qr" role="img" aria-label="QR code per entrare nella stanza" style:width={`${dimensione}px`} style:height={`${dimensione}px`}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html svg}
</div>

<style>
  .qr {
    flex-shrink: 0;
    padding: 6px;
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid var(--line);
    box-sizing: content-box;
  }

  .qr :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
