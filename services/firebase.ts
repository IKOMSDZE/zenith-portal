// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDffsyq4Lb1DYhAAkuEPZnZyzYjnCEiX7g",
  authDomain: "bh-portal-f120b.firebaseapp.com",
  projectId: "bh-portal-f120b",
  storageBucket: "bh-portal-f120b.firebasestorage.app",
  messagingSenderId: "1039147448424",
  appId: "1:1039147448424:web:f2ff175c5ed69ddeb3a3dd",
  measurementId: "G-E0ZSRSBTKC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics (optional - only if it works)
let analytics;
try {
  if (typeof window !== 'undefined') {
    const { getAnalytics } = require("firebase/analytics");
    analytics = getAnalytics(app);
    console.log('✅ Analytics enabled');
  }
} catch (error) {
  console.log('⚠️ Analytics not available (this is OK)');
}

console.log('✅ Firebase initialized: Auth + Firestore ready');

export { auth, db, app };