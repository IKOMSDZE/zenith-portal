
// services/firebase.ts
import * as FirebaseApp from "firebase/app";
const { initializeApp, getApp, getApps } = FirebaseApp as any;

import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDffsyq4Lb1DYhAAkuEPZnZyzYjnCEiX7g",
  authDomain: "bh-portal-f120b.firebaseapp.com",
  projectId: "bh-portal-f120b",
  storageBucket: "bh-portal-f120b.firebasestorage.app",
  messagingSenderId: "1039147448424",
  appId: "1:1039147448424:web:f2ff175c5ed69ddeb3a3dd",
  measurementId: "G-E0ZSRSBTKC"
};

// Initialize Firebase once using modular SDK functions directly
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

/**
 * OPTIMIZED FIRESTORE INITIALIZATION
 * experimentalForceLongPolling: true - Replaces WebSockets with HTTPS long polling.
 * This is crucial for bypassing restrictive firewalls or corporate proxies that 
 * frequently interrupt the persistent connection.
 */
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true, 
});

const auth = getAuth(app);

// Optional: Listen to online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.debug("✅ Connection restored - syncing data...");
  });

  window.addEventListener('offline', () => {
    console.debug("📱 Working offline: Data will be persisted locally.");
  });
}

export { app, db, auth };
