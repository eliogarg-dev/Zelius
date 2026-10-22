// Dizionario compresso come grafo di parole (DAWG), salvato in un Uint32Array.
//
// Ogni nodo è una sequenza contigua di archi, ordinati per lettera.
// Un arco occupa 32 bit:
//   bit 0-4   simbolo (0-20)
//   bit 5     la parola finisce dopo questo arco
//   bit 6     ultimo arco del nodo
//   bit 7-31  indice del primo arco del nodo figlio (0 = nessun figlio)
// archi[0] contiene l'indice del nodo radice.

const MASCHERA_SIMBOLO = 0x1f;
const FINE_PAROLA = 1 << 5;
const ULTIMO_ARCO = 1 << 6;
const SPOSTAMENTO_FIGLIO = 7;

export class Dizionario {
  readonly archi: Uint32Array;
  readonly radice: number;

  constructor(archi: Uint32Array) {
    this.archi = archi;
    this.radice = archi[0];
  }

  static daBuffer(buffer: ArrayBuffer): Dizionario {
    return new Dizionario(new Uint32Array(buffer));
  }

  /**
   * Cerca l'arco con il simbolo dato tra quelli del nodo.
   * Restituisce l'indice dell'arco, oppure -1.
   */
  arco(nodo: number, simbolo: number): number {
    if (nodo === 0) return -1;
    for (let i = nodo; ; i++) {
      const a = this.archi[i];
      const s = a & MASCHERA_SIMBOLO;
      if (s === simbolo) return i;
      if (s > simbolo || a & ULTIMO_ARCO) return -1;
    }
  }

  /** Nodo raggiunto seguendo l'arco (0 se non ci sono altre lettere). */
  figlio(arco: number): number {
    return this.archi[arco] >>> SPOSTAMENTO_FIGLIO;
  }

  /** Vero se una parola finisce dopo questo arco. */
  finisceParola(arco: number): boolean {
    return (this.archi[arco] & FINE_PAROLA) !== 0;
  }

  contiene(simboli: readonly number[]): boolean {
    let nodo = this.radice;
    let arco = -1;
    for (const s of simboli) {
      arco = this.arco(nodo, s);
      if (arco < 0) return false;
      nodo = this.figlio(arco);
    }
    return arco >= 0 && this.finisceParola(arco);
  }
}

interface NodoTrie {
  figli: Map<number, NodoTrie>;
  fine: boolean;
}

/**
 * Costruisce il DAWG da un elenco di parole già convertite in simboli.
 * Usato dallo script che prepara il dizionario e dai test.
 */
export function costruisciDawg(parole: Iterable<readonly number[]>): Uint32Array {
  const radice: NodoTrie = { figli: new Map(), fine: false };
  for (const parola of parole) {
    let nodo = radice;
    for (const s of parola) {
      let f = nodo.figli.get(s);
      if (!f) {
        f = { figli: new Map(), fine: false };
        nodo.figli.set(s, f);
      }
      nodo = f;
    }
    nodo.fine = true;
  }

  // Nodi con lo stesso contenuto vengono salvati una volta sola.
  const archi: number[] = [0];
  const perFirma = new Map<string, number>();
  const posizione = new Map<NodoTrie, number>();

  function salva(nodo: NodoTrie): number {
    const gia = posizione.get(nodo);
    if (gia !== undefined) return gia;
    if (nodo.figli.size === 0) {
      posizione.set(nodo, 0);
      return 0;
    }
    const ordinati = [...nodo.figli.entries()].sort((a, b) => a[0] - b[0]);
    const elenco = ordinati.map(([s, f]) => {
      let a = s | (salva(f) << SPOSTAMENTO_FIGLIO);
      if (f.fine) a |= FINE_PAROLA;
      return a >>> 0;
    });
    const firma = elenco.join(',');
    let inizio = perFirma.get(firma);
    if (inizio === undefined) {
      inizio = archi.length;
      elenco[elenco.length - 1] = (elenco[elenco.length - 1] | ULTIMO_ARCO) >>> 0;
      archi.push(...elenco);
      perFirma.set(firma, inizio);
    }
    posizione.set(nodo, inizio);
    return inizio;
  }

  archi[0] = salva(radice);
  return Uint32Array.from(archi);
}
