import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const S = 'stanze/K74Q';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-zelius',
    database: {
      rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
});

afterAll(() => env.cleanup());

const db = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();

function giocatore(nome: string, via: 'app' | 'web', entrato: number, online = true) {
  return { nome, via, entrato, online };
}

/** Stanza con host "host" (app), "bob" (app), "web" (browser) e una mano in corso. */
async function preparaStanza(mano: { inizio: number; fine: number } | null = null) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const adesso = Date.now();
    await ctx.database().ref(S).set({
      meta: { host: 'host', creata: adesso - 60_000, stato: mano ? 'gioco' : 'attesa', ...(mano ? { mano: 1 } : {}) },
      impostazioni: { lato: 4, durata: 120, minLettere: 4 },
      giocatori: {
        host: giocatore('Host', 'app', adesso - 60_000),
        bob: giocatore('Bob', 'app', adesso - 50_000),
        web: giocatore('Web', 'web', adesso - 40_000),
      },
      ...(mano
        ? {
            mani: { 1: { griglia: 'cartsqeaadrolin', inizio: mano.inizio, fine: mano.fine, sale: 1, impronte: 'x,y', minLettere: 4 } },
            soluzioni: { 1: 'CASA QUADRO' },
          }
        : {}),
    });
  });
}

beforeEach(() => env.clearDatabase());

describe('creazione della stanza', () => {
  it('chiunque sia autenticato crea una stanza libera indicandosi come host', async () => {
    await assertSucceeds(db('alice').ref(`${S}/meta`).set({ host: 'alice', creata: Date.now(), stato: 'attesa' }));
    await assertFails(db(null).ref('stanze/ZZZZ/meta').set({ host: 'x', creata: Date.now(), stato: 'attesa' }));
  });

  it('non si può prendere una stanza altrui né indicare un altro come host', async () => {
    await preparaStanza();
    await assertFails(db('alice').ref(`${S}/meta`).set({ host: 'alice', creata: Date.now(), stato: 'attesa' }));
    await assertFails(db('alice').ref('stanze/NUOV/meta').set({ host: 'bob', creata: Date.now(), stato: 'attesa' }));
  });

  it('solo l\'host cambia le impostazioni, con valori ammessi', async () => {
    await preparaStanza();
    await assertSucceeds(db('host').ref(`${S}/impostazioni`).set({ lato: 5, durata: 180, minLettere: 5 }));
    await assertFails(db('host').ref(`${S}/impostazioni`).set({ lato: 6, durata: 180, minLettere: 5 }));
    await assertSucceeds(db('host').ref(`${S}/impostazioni/automatico`).set(true));
    await assertFails(db('host').ref(`${S}/impostazioni/automatico`).set('sì'));
    await assertSucceeds(db('host').ref(`${S}/impostazioni/attesa`).set(10));
    await assertSucceeds(db('host').ref(`${S}/impostazioni/voto`).set(true));
    await assertFails(db('host').ref(`${S}/impostazioni/voto`).set('sì'));
    await assertFails(db('host').ref(`${S}/impostazioni/attesa`).set(5));
    await assertFails(db('host').ref(`${S}/impostazioni/attesa`).set(15));
    await assertFails(db('bob').ref(`${S}/impostazioni/lato`).set(5));
    await assertSucceeds(db('host').ref(`${S}/meta/pausa`).set(true));
    await assertFails(db('host').ref(`${S}/meta/pausa`).set('sì'));
    await assertSucceeds(db('host').ref(`${S}/meta/interrotta`).set('Host'));
    await assertFails(db('host').ref(`${S}/meta/interrotta`).set(true));
    await assertFails(db('bob').ref(`${S}/meta/pausa`).set(false));
  });
});

describe('accesso alla stanza', () => {
  it('chi vuole entrare manda una richiesta, ma non può aggiungersi da solo', async () => {
    await preparaStanza();
    await assertSucceeds(db('carla').ref(`${S}/richieste/carla`).set({ nome: 'Carla', via: 'web', at: Date.now() }));
    await assertFails(db('carla').ref(`${S}/richieste/dario`).set({ nome: 'Dario', via: 'web', at: Date.now() }));
    await assertFails(db('carla').ref(`${S}/giocatori/carla`).set(giocatore('Carla', 'web', Date.now())));
  });

  it('l\'host vede le richieste, approva e blocca', async () => {
    await preparaStanza();
    await db('carla').ref(`${S}/richieste/carla`).set({ nome: 'Carla', via: 'web', at: Date.now() });
    await assertSucceeds(db('host').ref(`${S}/richieste`).get());
    await assertFails(db('bob').ref(`${S}/richieste`).get());
    await assertSucceeds(db('host').ref(`${S}/giocatori/carla`).set(giocatore('Carla', 'web', Date.now(), false)));
    await assertSucceeds(db('host').ref(`${S}/richieste/carla`).remove());
    await assertSucceeds(db('host').ref(`${S}/bloccati/dario`).set(true));
  });

  it('chi è bloccato non può più chiedere di entrare', async () => {
    await preparaStanza();
    await db('host').ref(`${S}/bloccati/dario`).set(true);
    await assertFails(db('dario').ref(`${S}/richieste/dario`).set({ nome: 'Dario', via: 'web', at: Date.now() }));
    await assertSucceeds(db('dario').ref(`${S}/bloccati/dario`).get());
  });

  it('chi non è in stanza non vede giocatori e mani', async () => {
    await preparaStanza({ inizio: Date.now() - 1000, fine: Date.now() + 60_000 });
    await assertFails(db('estraneo').ref(`${S}/giocatori`).get());
    await assertFails(db('estraneo').ref(`${S}/mani`).get());
    await assertSucceeds(db('estraneo').ref(`${S}/meta`).get());
    await assertSucceeds(db('web').ref(`${S}/mani`).get());
  });

  it('un giocatore aggiorna solo il proprio stato online', async () => {
    await preparaStanza();
    await assertSucceeds(db('web').ref(`${S}/giocatori/web/online`).set(false));
    await assertFails(db('web').ref(`${S}/giocatori/bob/online`).set(false));
    await assertFails(db('web').ref(`${S}/giocatori/web/nome`).set('Altro'));
  });
});

describe('durante la mano', () => {
  it('le soluzioni restano nascoste fino alla fine', async () => {
    await preparaStanza({ inizio: Date.now() - 1000, fine: Date.now() + 60_000 });
    await assertFails(db('web').ref(`${S}/soluzioni/1`).get());
  });

  it('a mano finita le soluzioni e le parole di tutti sono visibili ai giocatori', async () => {
    await preparaStanza({ inizio: Date.now() - 130_000, fine: Date.now() - 10_000 });
    await assertSucceeds(db('web').ref(`${S}/soluzioni/1`).get());
    await assertSucceeds(db('web').ref(`${S}/parole/1`).get());
    await assertFails(db('estraneo').ref(`${S}/soluzioni/1`).get());
  });

  it('un giocatore scrive le proprie parole solo durante la mano', async () => {
    await preparaStanza({ inizio: Date.now() - 1000, fine: Date.now() + 60_000 });
    await assertSucceeds(db('web').ref(`${S}/parole/1/web/CASA`).set(true));
    await assertFails(db('web').ref(`${S}/parole/1/bob/CASA`).set(true));
    await assertFails(db('web').ref(`${S}/parole/1/web/casa`).set(true));
    await assertFails(db('estraneo').ref(`${S}/parole/1/estraneo/CASA`).set(true));
  });

  it('durante la mano non si leggono le parole degli altri', async () => {
    await preparaStanza({ inizio: Date.now() - 1000, fine: Date.now() + 60_000 });
    await db('bob').ref(`${S}/parole/1/bob/CASA`).set(true);
    await assertFails(db('web').ref(`${S}/parole/1/bob`).get());
    await assertSucceeds(db('bob').ref(`${S}/parole/1/bob`).get());
  });

  it('dopo la fine (più 3 secondi di tolleranza) le parole sono rifiutate', async () => {
    await preparaStanza({ inizio: Date.now() - 130_000, fine: Date.now() - 5000 });
    await assertFails(db('web').ref(`${S}/parole/1/web/CASA`).set(true));
  });

  it('chi entra a mano iniziata aspetta la mano successiva', async () => {
    await preparaStanza({ inizio: Date.now() - 10_000, fine: Date.now() + 60_000 });
    await db('host').ref(`${S}/giocatori/tardi`).set(giocatore('Tardi', 'web', Date.now()));
    await assertFails(db('tardi').ref(`${S}/parole/1/tardi/CASA`).set(true));
  });

  it('solo l\'host scrive mani e risultati, e i risultati una volta sola', async () => {
    await preparaStanza({ inizio: Date.now() - 130_000, fine: Date.now() - 10_000 });
    const risultati = { punti: { host: 3 }, totali: { host: 3 } };
    await assertFails(db('bob').ref(`${S}/risultati/1`).set(risultati));
    await assertSucceeds(db('host').ref(`${S}/risultati/1`).set(risultati));
    await assertFails(db('host').ref(`${S}/risultati/1`).set(risultati));
    await assertFails(db('bob').ref(`${S}/mani/2`).set({ griglia: 'a', inizio: 1, fine: 2, sale: 1, impronte: '', minLettere: 4 }));
  });

  it('solo l\'host interrompe la mano in corso', async () => {
    await preparaStanza({ inizio: Date.now() - 10_000, fine: Date.now() + 110_000 });
    const interruzione = { 'mani/1/fine': Date.now(), 'meta/pausa': true, 'meta/interrotta': 'Host' };
    await assertFails(db('bob').ref(S).update(interruzione));
    await assertSucceeds(db('host').ref(S).update(interruzione));
  });
});

describe('voto sulle parole scartate', () => {
  // Mano iniziata dopo l'ingresso di tutti (l'ultimo entra 40 s fa).
  async function conVoto(voto: boolean, fine = Date.now() - 1000) {
    await preparaStanza({ inizio: fine - 30_000, fine });
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`${S}/mani/1/voto`).set(voto));
  }

  it('a mano finita ognuno propone al massimo due parole sue', async () => {
    await conVoto(true);
    await assertSucceeds(db('bob').ref(`${S}/proposte/1/bob/0`).set('CARTSE'));
    await assertSucceeds(db('bob').ref(`${S}/proposte/1/bob/1`).set('TRAS'));
    await assertFails(db('bob').ref(`${S}/proposte/1/bob/2`).set('ALTRA'));
    await assertFails(db('bob').ref(`${S}/proposte/1/bob/0`).set('ALTRA'));
    await assertFails(db('bob').ref(`${S}/proposte/1/web/0`).set('ALTRA'));
    await assertFails(db('web').ref(`${S}/proposte/1/web/0`).set('casa'));
    await assertSucceeds(db('web').ref(`${S}/proposte/1`).get());
  });

  it('niente proposte se il voto è spento o la mano è in corso', async () => {
    await conVoto(false);
    await assertFails(db('bob').ref(`${S}/proposte/1/bob/0`).set('CARTSE'));
    await conVoto(true, Date.now() + 60_000);
    await assertFails(db('bob').ref(`${S}/proposte/1/bob/0`).set('CARTSE'));
  });

  it('ognuno vota una volta sola, e solo per sé', async () => {
    await conVoto(true);
    await assertSucceeds(db('web').ref(`${S}/voti/1/CARTSE/web`).set(true));
    await assertFails(db('web').ref(`${S}/voti/1/CARTSE/web`).set(false));
    await assertFails(db('web').ref(`${S}/voti/1/CARTSE/bob`).set(false));
    await assertFails(db('web').ref(`${S}/voti/1/ALTRA/web`).set('sì'));
  });

  it('solo l\'host chiude il voto e aggiorna i punti della mano', async () => {
    await conVoto(true);
    await db('host').ref(`${S}/risultati/1`).set({ punti: { bob: 3 }, totali: { bob: 3 } });
    const approvata = { 'esiti/1/CARTSE': true, 'risultati/1/punti/bob': 6, 'risultati/1/totali/bob': 6, 'risultati/1/trovate/CARTSE': 'bob' };
    await assertFails(db('bob').ref(S).update(approvata));
    await assertSucceeds(db('host').ref(S).update(approvata));
    await assertFails(db('host').ref(`${S}/esiti/1/CARTSE`).set(false));
  });
});

describe('cambio di host', () => {
  it('se l\'host è offline un giocatore con l\'app può subentrare', async () => {
    await preparaStanza();
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`${S}/giocatori/host/online`).set(false));
    await assertFails(db('web').ref(`${S}/meta/host`).set('web'));
    await assertSucceeds(db('bob').ref(`${S}/meta/host`).set('bob'));
    await assertSucceeds(db('bob').ref(`${S}/impostazioni/lato`).set(5));
  });

  it('nessuno subentra se l\'host è online', async () => {
    await preparaStanza();
    await assertFails(db('bob').ref(`${S}/meta/host`).set('bob'));
  });
});

describe('chiusura', () => {
  it('solo l\'host cancella la stanza', async () => {
    await preparaStanza();
    await assertFails(db('bob').ref(S).remove());
    await assertSucceeds(db('host').ref(S).remove());
  });
});

describe('segnalazioni', () => {
  it('chiunque sia autenticato segnala una parola, ma nessuno le legge', async () => {
    await assertSucceeds(db('web').ref('segnalazioni/a1').set({ parola: 'ZUCCHINE', griglia: 'abc', at: 1, uid: 'web' }));
    await assertFails(db('web').ref('segnalazioni/a2').set({ parola: 'ZUCCHINE', griglia: 'abc', at: 1, uid: 'altro' }));
    await assertFails(db('web').ref('segnalazioni').get());
  });
});
