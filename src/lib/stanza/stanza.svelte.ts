// Una stanza di gioco su Firebase, vista da un giocatore (host compreso).
// Tiene aggiornato lo stato in tempo reale e, se questo dispositivo è l'host,
// prepara le mani e calcola i risultati.

import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { caricaDizionario } from '../dizionario.ts';
import { accedi, database, oraServer, scartoOrologio } from '../firebase.ts';
import { preparaMano as generaMano, type Lato } from '../game/griglia.ts';
import { verificaParola, type Esito, type Proposta } from '../game/verifica.ts';
import { eApp, piattaforma } from '../piattaforma.ts';
import {
  calcolaRisultati,
  elencoCifrato,
  generaCodice,
  grigliaDaTesto,
  grigliaInTesto,
  impronta,
  nomeLibero,
  nuovoHost,
  type RisultatiMano,
} from './logica.ts';

export interface Meta {
  host: string;
  creata: number;
  stato: 'attesa' | 'gioco';
  mano?: number;
}

export interface Impostazioni {
  lato: Lato;
  durata: 60 | 120 | 180;
  minLettere: 4 | 5 | 6;
}

export interface Giocatore {
  nome: string;
  via: 'app' | 'web';
  entrato: number;
  online: boolean;
}

export interface Richiesta {
  nome: string;
  via: 'app' | 'web';
  at: number;
}

interface DatiMano {
  griglia: string;
  inizio: number;
  fine: number;
  sale: number;
  impronte: string;
  minLettere: number;
}

export interface ManoCorrente {
  n: number;
  griglia: number[];
  inizio: number;
  fine: number;
  minLettere: number;
  impronte: Set<string>;
  sale: number;
}

export interface RisultatiVisti {
  n: number;
  dati: RisultatiMano | null;
  soluzioni: string[] | null;
  griglia: number[];
}

export type Accesso = 'caricamento' | 'inesistente' | 'richiesta' | 'rifiutato' | 'bloccato' | 'dentro' | 'chiusa' | 'errore';
export type Fase = 'attesa' | 'conto' | 'gioco' | 'spettatore' | 'risultati' | 'finita';

/** Pausa tra una mano e l'altra. */
export const PAUSA_MS = 45_000;
/** Tolleranza per le parole inviate negli ultimi istanti (deve stare sotto i 3 s delle regole). */
const TOLLERANZA_MS = 2500;

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = { lato: 4, durata: 120, minLettere: 4 };

export class Stanza {
  readonly codice: string;
  readonly uid: string;
  readonly nome: string;

  accesso: Accesso = $state('caricamento');
  errore = $state('');
  meta: Meta | null = $state(null);
  impostazioni: Impostazioni = $state({ ...IMPOSTAZIONI_PREDEFINITE });
  giocatori: Record<string, Giocatore> = $state({});
  richieste: Record<string, Richiesta> = $state({});
  mano: ManoCorrente | null = $state(null);
  risultati: RisultatiVisti | null = $state(null);
  mieParole: { parola: string; punti: number }[] = $state([]);
  adesso = $state(oraServer());

  private radice: DatabaseReference;
  private ascolti: Unsubscribe[] = [];
  private ascoltoGiocatori: Unsubscribe | null = null;
  private ascoltoRichieste: Unsubscribe | null = null;
  private ascoltoMano: Unsubscribe | null = null;
  private ascoltoRisultati: Unsubscribe | null = null;
  private manoAscoltata = 0;
  private risultatiAscoltati = 0;
  private timer: ReturnType<typeof setInterval>;
  private lavorando = false;
  private soluzioniPreparate = new Map<number, string[]>();
  private chiusa = false;

  private constructor(codice: string, uid: string, nome: string) {
    this.codice = codice;
    this.uid = uid;
    this.nome = nome;
    this.radice = ref(database(), `stanze/${codice}`);
    this.timer = setInterval(() => this.battito(), 250);
  }

  // ---------- Entrare e creare ----------

  /** Crea una stanza nuova con questo dispositivo come host (solo app). */
  static async crea(nome: string): Promise<Stanza> {
    const utente = await accedi();
    const db = database();
    for (let tentativo = 0; tentativo < 10; tentativo++) {
      const codice = generaCodice();
      const esito = await runTransaction(ref(db, `stanze/${codice}/meta`), (attuale) =>
        attuale === null ? { host: utente.uid, creata: oraServer(), stato: 'attesa' } : undefined,
      );
      if (!esito.committed) continue;
      await update(ref(db, `stanze/${codice}`), {
        impostazioni: { ...IMPOSTAZIONI_PREDEFINITE },
        [`giocatori/${utente.uid}`]: { nome: nomeLibero(nome, []), via: piattaforma, entrato: serverTimestamp(), online: true },
      });
      const stanza = new Stanza(codice, utente.uid, nome);
      await stanza.avvia();
      return stanza;
    }
    throw new Error('Non riesco a trovare un codice libero per la stanza');
  }

  /** Entra in una stanza esistente: se non si è già dentro, manda la richiesta all'host. */
  static async entra(codice: string, nome: string): Promise<Stanza> {
    const utente = await accedi();
    const stanza = new Stanza(codice, utente.uid, nome);
    await stanza.avvia();
    return stanza;
  }

  private figlio(percorso: string) {
    return ref(database(), `stanze/${this.codice}/${percorso}`);
  }

  private async avvia() {
    const [meta, io, bloccato, rifiutato] = await Promise.all([
      get(this.figlio('meta')),
      get(this.figlio(`giocatori/${this.uid}`)),
      get(this.figlio(`bloccati/${this.uid}`)),
      get(this.figlio(`rifiutati/${this.uid}`)),
    ]);
    if (!meta.exists()) {
      this.accesso = 'inesistente';
      return;
    }
    if (!io.exists()) {
      if (bloccato.exists()) this.accesso = 'bloccato';
      else if (rifiutato.exists()) this.accesso = 'rifiutato';
      else await this.chiediAccesso();
    }

    this.ascolti.push(
      onValue(this.figlio('meta'), (s) => this.aggiornaMeta(s.val())),
      onValue(this.figlio('impostazioni'), (s) => {
        if (s.exists()) this.impostazioni = s.val();
      }),
      onValue(
        this.figlio(`giocatori/${this.uid}`),
        (s) => {
          if (s.exists()) this.entrato();
        },
        () => {},
      ),
      onValue(
        this.figlio(`bloccati/${this.uid}`),
        (s) => {
          if (s.exists() && this.accesso !== 'dentro') this.accesso = 'bloccato';
        },
        () => {},
      ),
      onValue(
        this.figlio(`rifiutati/${this.uid}`),
        (s) => {
          if (s.exists() && this.accesso === 'richiesta') this.accesso = 'rifiutato';
        },
        () => {},
      ),
      // A ogni (ri)connessione: segna la presenza, o rimanda la richiesta caduta con la connessione.
      onValue(ref(database(), '.info/connected'), (s) => {
        if (s.val() !== true || this.chiusa) return;
        if (this.accesso === 'dentro') void this.segnaOnline();
        else if (this.accesso === 'richiesta') void this.chiediAccesso();
      }),
    );
  }

  private async segnaOnline() {
    await onDisconnect(this.figlio(`giocatori/${this.uid}/online`)).set(false);
    await set(this.figlio(`giocatori/${this.uid}/online`), true);
  }

  private async chiediAccesso() {
    try {
      // Se chi chiede chiude la pagina, la richiesta sparisce dalla lista dell'host.
      await onDisconnect(this.figlio(`richieste/${this.uid}`)).remove();
      await set(this.figlio(`richieste/${this.uid}`), { nome: this.nome.slice(0, 24) || 'Giocatore', via: piattaforma, at: serverTimestamp() });
      if (this.accesso !== 'dentro') this.accesso = 'richiesta';
    } catch {
      // Rifiutata dalle regole: o si è stati bloccati, o si è appena stati fatti entrare.
      const bloccato = await get(this.figlio(`bloccati/${this.uid}`)).catch(() => null);
      if (this.accesso !== 'dentro') this.accesso = bloccato?.exists() ? 'bloccato' : 'errore';
    }
  }

  /** Dopo un rifiuto si può chiedere di nuovo. */
  async chiediDiNuovo() {
    await remove(this.figlio(`rifiutati/${this.uid}`));
    await this.chiediAccesso();
  }

  private entrato() {
    if (this.accesso === 'dentro') return;
    this.accesso = 'dentro';
    onDisconnect(this.figlio(`richieste/${this.uid}`)).cancel();
    this.ascoltoGiocatori = onValue(this.figlio('giocatori'), (s) => (this.giocatori = s.val() ?? {}));
    void this.segnaOnline().catch(() => {});
    this.aggiornaMeta(this.meta);
  }

  private aggiornaMeta(meta: Meta | null) {
    if (!meta) {
      if (this.accesso !== 'caricamento' && this.accesso !== 'inesistente') this.accesso = 'chiusa';
      this.meta = null;
      return;
    }
    this.meta = meta;
    if (this.accesso !== 'dentro') return;

    // Le richieste di accesso le vede solo l'host.
    if (this.eHost && !this.ascoltoRichieste) {
      this.ascoltoRichieste = onValue(this.figlio('richieste'), (s) => (this.richieste = s.val() ?? {}));
    } else if (!this.eHost && this.ascoltoRichieste) {
      this.ascoltoRichieste();
      this.ascoltoRichieste = null;
      this.richieste = {};
    }

    const n = meta.mano ?? 0;
    if (n !== this.manoAscoltata) {
      this.manoAscoltata = n;
      this.ascoltoMano?.();
      this.ascoltoMano = null;
      if (n > 0) this.ascoltaMano(n);
    }
  }

  private ascoltaMano(n: number) {
    this.mieParole = [];
    this.ascoltoMano = onValue(this.figlio(`mani/${n}`), (s) => {
      const d: DatiMano | null = s.val();
      if (!d) return;
      this.mano = {
        n,
        griglia: grigliaDaTesto(d.griglia),
        inizio: d.inizio,
        fine: d.fine,
        minLettere: d.minLettere,
        sale: d.sale,
        impronte: new Set(d.impronte ? d.impronte.split(',') : []),
      };
    });
    // Dopo una disconnessione si ritrovano le parole già inviate.
    get(this.figlio(`parole/${n}/${this.uid}`))
      .then((s) => {
        const salvate = Object.keys(s.val() ?? {});
        if (salvate.length && this.manoAscoltata === n) {
          const gia = new Set(this.mieParole.map((p) => p.parola));
          void Promise.all(salvate.filter((p) => !gia.has(p)).map((p) => this.valutaSalvata(p)));
        }
      })
      .catch(() => {});
  }

  private async valutaSalvata(parola: string) {
    if (!this.mano) return;
    const esito = await verificaParola({ testo: parola }, this.mano.griglia, this.mano.minLettere, new Set(), () => true);
    if (esito.ok && !this.mieParole.some((p) => p.parola === parola)) this.mieParole = [...this.mieParole, { parola, punti: esito.punti }];
  }

  // ---------- Stato derivato ----------

  get eHost(): boolean {
    return this.meta?.host === this.uid;
  }

  get io(): Giocatore | undefined {
    return this.giocatori[this.uid];
  }

  get numeroOnline(): number {
    return Object.values(this.giocatori).filter((g) => g.online).length;
  }

  /** Nessuno con l'app può più fare da host: la partita non può continuare. */
  get senzaHost(): boolean {
    if (!this.meta) return false;
    const host = this.giocatori[this.meta.host];
    if (!host || host.online) return false;
    return nuovoHost(this.giocatori, this.meta.host) === null;
  }

  get fase(): Fase {
    const m = this.mano;
    if (!this.meta || this.meta.stato === 'attesa' || !m) return 'attesa';
    if (this.adesso < m.inizio) return this.senzaHost ? 'finita' : 'conto';
    if (this.adesso < m.fine) {
      return this.io && this.io.entrato > m.inizio ? 'spettatore' : 'gioco';
    }
    return this.senzaHost ? 'finita' : 'risultati';
  }

  /** Istante di fine mano convertito nell'orologio di questo dispositivo. */
  get fineLocale(): number {
    return (this.mano?.fine ?? 0) - scartoOrologio();
  }

  get inizioLocale(): number {
    return (this.mano?.inizio ?? 0) - scartoOrologio();
  }

  // ---------- Battito: tempo, risultati, compiti dell'host ----------

  private battito() {
    if (this.chiusa) return;
    this.adesso = oraServer();
    if (this.accesso !== 'dentro' || !this.meta) return;

    const m = this.mano;
    // Risultati da mostrare: quelli della mano appena finita, o della precedente durante il conto alla rovescia.
    const nr = m ? (this.adesso < m.inizio ? m.n - 1 : this.adesso >= m.fine ? m.n : 0) : 0;
    if (nr !== this.risultatiAscoltati) this.ascoltaRisultati(nr);

    const manoFinita = !m || this.adesso > m.fine + TOLLERANZA_MS;
    if (this.eHost && this.meta.stato === 'gioco' && m && manoFinita && !this.lavorando && this.risultati?.n === m.n && !this.risultati.dati && this.risultatiCaricati) {
      void this.chiudiMano(m);
    }

    // Nuovo host subentrato quando i risultati erano già scritti ma la mano successiva no.
    if (this.eHost && this.meta.stato === 'gioco' && m && this.meta.mano === m.n && manoFinita && !this.lavorando && this.risultati?.n === m.n && this.risultati.dati) {
      this.lavorando = true;
      this.preparaMano(m.n + 1, Math.max(m.fine + PAUSA_MS, oraServer() + 10_000))
        .catch((e) => console.error('Errore nel preparare la mano', e))
        .finally(() => (this.lavorando = false));
    }

    // Se l'host è uscito, il primo giocatore con l'app online subentra appena non c'è una mano in corso
    // (durante la pausa, o a mano finita).
    const manoInCorso = m !== null && this.adesso >= m.inizio && this.adesso <= m.fine + TOLLERANZA_MS;
    if (!this.eHost && eApp && !manoInCorso && !this.lavorando && nuovoHost(this.giocatori, this.meta.host) === this.uid) {
      this.lavorando = true;
      set(this.figlio('meta/host'), this.uid)
        .catch(() => {})
        .finally(() => (this.lavorando = false));
    }
  }

  private risultatiCaricati = false;

  private ascoltaRisultati(n: number) {
    this.ascoltoRisultati?.();
    this.ascoltoRisultati = null;
    this.risultatiAscoltati = n;
    this.risultatiCaricati = false;
    if (n <= 0 || !this.mano) {
      this.risultati = null;
      return;
    }
    const griglia = n === this.mano.n ? this.mano.griglia : [];
    this.risultati = { n, dati: null, soluzioni: null, griglia };
    if (n !== this.mano.n) {
      get(this.figlio(`mani/${n}/griglia`))
        .then((s) => {
          if (this.risultati?.n === n && s.exists()) this.risultati = { ...this.risultati, griglia: grigliaDaTesto(s.val()) };
        })
        .catch(() => {});
    }
    this.ascoltoRisultati = onValue(
      this.figlio(`risultati/${n}`),
      (s) => {
        this.risultatiCaricati = true;
        if (this.risultati?.n === n) this.risultati = { ...this.risultati, dati: s.val() };
      },
      () => {},
    );
    void this.caricaSoluzioni(n);
  }

  private async caricaSoluzioni(n: number, tentativi = 5) {
    try {
      const s = await get(this.figlio(`soluzioni/${n}`));
      const elenco = String(s.val() ?? '').split(' ').filter(Boolean);
      if (this.risultati?.n === n) this.risultati = { ...this.risultati, soluzioni: elenco };
    } catch {
      // Lettura troppo vicina alla fine della mano: si riprova tra poco.
      if (tentativi > 0) setTimeout(() => this.caricaSoluzioni(n, tentativi - 1), 1000);
    }
  }

  /** Solo host: calcola i risultati della mano finita e prepara la successiva. */
  private async chiudiMano(m: ManoCorrente) {
    this.lavorando = true;
    try {
      const soluzioni =
        this.soluzioniPreparate.get(m.n) ?? String((await get(this.figlio(`soluzioni/${m.n}`))).val() ?? '').split(' ').filter(Boolean);
      const [parole, precedenti] = await Promise.all([
        get(this.figlio(`parole/${m.n}`)),
        m.n > 1 ? get(this.figlio(`risultati/${m.n - 1}/totali`)) : Promise.resolve(null),
      ]);
      const partecipanti = Object.entries(this.giocatori)
        .filter(([, g]) => g.entrato <= m.inizio)
        .map(([uid]) => uid);
      const r = calcolaRisultati(parole.val() ?? {}, new Set(soluzioni), precedenti?.val() ?? {}, partecipanti);
      await set(this.figlio(`risultati/${m.n}`), r).catch(() => {});
      this.soluzioniPreparate.delete(m.n);
      await this.preparaMano(m.n + 1, Math.max(m.fine + PAUSA_MS, oraServer() + 10_000));
    } catch (e) {
      console.error('Errore nel chiudere la mano', e);
    } finally {
      this.lavorando = false;
    }
  }

  private async preparaMano(n: number, inizio: number) {
    const diz = await caricaDizionario();
    const imp = this.impostazioni;
    const mano = generaMano(imp.lato, imp.minLettere, diz);
    const parole = mano.soluzioni.map((s) => s.parola);
    const sale = Math.floor(Math.random() * 2 ** 31);
    this.soluzioniPreparate.set(n, parole);
    await update(this.radice, {
      [`mani/${n}`]: {
        griglia: grigliaInTesto(mano.griglia),
        inizio,
        fine: inizio + imp.durata * 1000,
        sale,
        impronte: elencoCifrato(parole, sale),
        minLettere: imp.minLettere,
      },
      [`soluzioni/${n}`]: parole.join(' '),
      'meta/mano': n,
      'meta/stato': 'gioco',
    });
  }

  // ---------- Azioni dei giocatori ----------

  async proponi(p: Proposta): Promise<Esito> {
    const m = this.mano;
    if (!m) return { ok: false, motivo: 'griglia', parola: '' };
    const trovate = new Set(this.mieParole.map((t) => t.parola));
    const esito = await verificaParola(p, m.griglia, m.minLettere, trovate, (parola) => m.impronte.has(impronta(parola, m.sale)));
    if (!esito.ok) return esito;
    this.mieParole = [...this.mieParole, { parola: esito.parola, punti: esito.punti }];
    set(this.figlio(`parole/${m.n}/${this.uid}/${esito.parola}`), true).catch(() => {
      // Inviata fuori tempo: non conta.
      this.mieParole = this.mieParole.filter((t) => t.parola !== esito.parola);
    });
    return esito;
  }

  async segnala(parola: string) {
    const griglia = this.risultati?.griglia ?? this.mano?.griglia ?? [];
    await set(ref(database(), `segnalazioni/${this.codice}-${Date.now()}-${this.uid.slice(0, 6)}`), {
      parola: parola.trim().toUpperCase().slice(0, 30),
      griglia: grigliaInTesto(griglia),
      at: serverTimestamp(),
      uid: this.uid,
    });
  }

  /** Esce dalla stanza su questo dispositivo (resta in classifica come offline). */
  async esci() {
    this.chiusa = true;
    try {
      if (this.accesso === 'dentro') await set(this.figlio(`giocatori/${this.uid}/online`), false);
      else if (this.accesso === 'richiesta') await remove(this.figlio(`richieste/${this.uid}`));
    } catch {
      // Già disconnessi: pazienza.
    }
    this.smetti();
  }

  private smetti() {
    this.chiusa = true;
    clearInterval(this.timer);
    for (const stop of this.ascolti) stop();
    this.ascoltoGiocatori?.();
    this.ascoltoRichieste?.();
    this.ascoltoMano?.();
    this.ascoltoRisultati?.();
  }

  // ---------- Azioni dell'host ----------

  async approva(uid: string) {
    const r = this.richieste[uid];
    if (!r) return;
    const nome = nomeLibero(r.nome, Object.values(this.giocatori).map((g) => g.nome));
    await update(this.radice, {
      [`giocatori/${uid}`]: { nome, via: r.via, entrato: serverTimestamp(), online: false },
      [`richieste/${uid}`]: null,
      [`rifiutati/${uid}`]: null,
    });
  }

  async approvaTutti() {
    for (const uid of Object.keys(this.richieste)) await this.approva(uid);
  }

  async rifiuta(uid: string) {
    await update(this.radice, { [`richieste/${uid}`]: null, [`rifiutati/${uid}`]: serverTimestamp() });
  }

  async blocca(uid: string) {
    await update(this.radice, { [`richieste/${uid}`]: null, [`bloccati/${uid}`]: true });
  }

  async cambiaImpostazioni(imp: Impostazioni) {
    await set(this.figlio('impostazioni'), imp);
  }

  async iniziaPartita() {
    this.lavorando = true;
    try {
      await this.preparaMano(1, oraServer() + 4000);
    } finally {
      this.lavorando = false;
    }
  }

  /** Chiude la stanza per tutti. */
  async chiudi() {
    this.smetti();
    await remove(this.radice);
  }
}
