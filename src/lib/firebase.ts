// Connessione a Firebase: identità anonima, database in tempo reale, ora del server.
// Con VITE_FIREBASE_EMULATORE=1 usa gli emulatori locali (npm run emulatori).

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, onValue, ref, type Database } from 'firebase/database';

const emulatore = import.meta.env.VITE_FIREBASE_EMULATORE === '1';
const progetto = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-zapp';
// Nell'app Capacitor intercetta tutto ciò che va a "localhost": col telefono via USB (adb reverse) si usa 127.0.0.1.
const hostEmulatore = import.meta.env.VITE_HOST_EMULATORE || location.hostname;

const config = emulatore
  ? {
      apiKey: 'demo',
      projectId: progetto,
      databaseURL: `http://${hostEmulatore}:9000?ns=${progetto}-default-rtdb`,
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: progetto,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

/** Vero se Firebase è configurato (in sviluppo basta l'emulatore). */
export const firebaseDisponibile = emulatore || Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

let app: FirebaseApp | null = null;
let db: Database | null = null;
let utente: Promise<User> | null = null;
let scarto = 0;

export function database(): Database {
  if (!db) {
    app = initializeApp(config);
    db = getDatabase(app);
    const auth = getAuth(app);
    if (emulatore) {
      connectDatabaseEmulator(db, hostEmulatore, 9000);
      connectAuthEmulator(auth, `http://${hostEmulatore}:9099`, { disableWarnings: true });
    }
    onValue(ref(db, '.info/serverTimeOffset'), (s) => (scarto = Number(s.val()) || 0));
  }
  return db;
}

/** Identità anonima del dispositivo: resta la stessa finché non si cancellano i dati del browser o dell'app. */
export function accedi(): Promise<User> {
  database();
  const auth = getAuth(app!);
  utente ??= new Promise<User>((risolvi, rifiuta) => {
    const stop = onAuthStateChanged(auth, (u) => {
      if (u) {
        stop();
        risolvi(u);
      }
    });
    signInAnonymously(auth).catch((e) => {
      stop();
      utente = null;
      rifiuta(e);
    });
  });
  return utente;
}

/** Ora del server in millisecondi, uguale per tutti i telefoni. */
export function oraServer(): number {
  return Date.now() + scarto;
}

/** Differenza tra orologio del server e orologio locale. */
export function scartoOrologio(): number {
  return scarto;
}
