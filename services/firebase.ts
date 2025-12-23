
// services/firebase.ts
// Fix: Use a more compatible import style from "firebase/app" to correctly initialize Firebase with modular SDK and avoid member export errors.
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

// ⭐ MODERN PERSISTENCE & CONNECTIVITY FIX
// We enable experimentalForceLongPolling to resolve "Could not reach Cloud Firestore backend"
// which is often caused by WebSocket blocks in specific environments.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true, // Fix for connectivity issues
});

const auth = getAuth(app);

// Optional: Listen to online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log("✅ Connection restored - syncing data...");
  });

  window.addEventListener('offline', () => {
    console.log("📱 Working offline");
  });
}

console.log("✅ Firebase initialized with long polling and persistence!");

export { app, db, auth };
