import { Dizionario } from './game/dawg.ts';

let caricamento: Promise<Dizionario> | null = null;

/** Carica il dizionario una volta sola (dentro l'app è un file locale, quindi funziona offline). */
export function caricaDizionario(): Promise<Dizionario> {
  caricamento ??= fetch(`${import.meta.env.BASE_URL}dizionario.bin`)
    .then((r) => {
      if (!r.ok) throw new Error(`Dizionario non disponibile (${r.status})`);
      return r.arrayBuffer();
    })
    .then((b) => Dizionario.daBuffer(b))
    .catch((e) => {
      caricamento = null;
      throw e;
    });
  return caricamento;
}
