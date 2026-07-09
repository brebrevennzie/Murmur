import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfigLocal from '../firebase-applet-config.json';

// Use environment variables if present, fallback to the auto-generated config
const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  const meta = (import.meta as any);
  if (meta && meta.env && meta.env[key]) {
    return meta.env[key];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || firebaseConfigLocal.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || firebaseConfigLocal.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || firebaseConfigLocal.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || firebaseConfigLocal.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseConfigLocal.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || firebaseConfigLocal.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Smart database ID: if VITE_FIREBASE_PROJECT_ID is a custom project (different from local config),
// default to undefined (which connects to the default '(default)' database) unless VITE_FIREBASE_FIRESTORE_DATABASE_ID is specified.
const isCustomProject = !!getEnv('VITE_FIREBASE_PROJECT_ID') && getEnv('VITE_FIREBASE_PROJECT_ID') !== firebaseConfigLocal.projectId;
const databaseId = isCustomProject
  ? (getEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || undefined)
  : (firebaseConfigLocal.firestoreDatabaseId || undefined);

// Use initializeFirestore with experimentalForceLongPolling to bypass ISP/network/VPN WebSocket blocks (e.g. in Russia/RF)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);
