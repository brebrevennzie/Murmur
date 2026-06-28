import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfigLocal from '../firebase-applet-config.json';

// Use environment variables if present, fallback to the auto-generated config
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigLocal.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigLocal.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigLocal.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigLocal.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigLocal.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigLocal.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Smart database ID: if VITE_FIREBASE_PROJECT_ID is a custom project (different from local config),
// default to undefined (which connects to the default '(default)' database) unless VITE_FIREBASE_FIRESTORE_DATABASE_ID is specified.
const isCustomProject = !!metaEnv.VITE_FIREBASE_PROJECT_ID && metaEnv.VITE_FIREBASE_PROJECT_ID !== firebaseConfigLocal.projectId;
const databaseId = isCustomProject
  ? (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined)
  : (firebaseConfigLocal.firestoreDatabaseId || undefined);

// Use initializeFirestore with experimentalForceLongPolling to bypass ISP/network/VPN WebSocket blocks (e.g. in Russia/RF)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);
