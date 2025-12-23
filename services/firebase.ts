
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
