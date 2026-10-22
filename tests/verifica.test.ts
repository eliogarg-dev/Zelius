import { describe, expect, it } from 'vitest';
import { inSimboli } from '../src/lib/game/alfabeto.ts';
import { verificaParola } from '../src/lib/game/verifica.ts';

const GRIGLIA = ['c', 'a', 'r', 't', 's', 'qu', 'e', 'a', 'a', 'd', 'r', 'o', 'l', 'i', 'n', 'e'].map(
  (l) => inSimboli(l)![0],
);
const DIZ = new Set(['QUADRO', 'CASA', 'CARTE']);
const nelDizionario = (p: string) => DIZ.has(p);

describe('verificaParola', () => {
  it('accetta una parola valida scritta con la tastiera', async () => {
    const esito = await verificaParola({ testo: 'quadro' }, GRIGLIA, 4, new Set(), nelDizionario);
    expect(esito).toMatchObject({ ok: true, parola: 'QUADRO', lettere: 6, punti: 3 });
  });

  it('spiega perché una parola è rifiutata', async () => {
    const trovate = new Set(['CASA']);
    const motivo = async (testo: string, min = 4) =>
      ((await verificaParola({ testo }, GRIGLIA, min, trovate, nelDizionario)) as { motivo: string }).motivo;
    expect(await motivo('taxi')).toBe('caratteri');
    expect(await motivo('casa', 5)).toBe('corta');
    expect(await motivo('treno')).toBe('griglia');
    expect(await motivo('casa')).toBe('gia');
    expect(await motivo('ladri')).toBe('dizionario');
  });

  it('accetta anche un controllo asincrono sul dizionario', async () => {
    const esito = await verificaParola({ testo: 'carte' }, GRIGLIA, 4, new Set(), async (p) => DIZ.has(p));
    expect(esito.ok).toBe(true);
  });
});
