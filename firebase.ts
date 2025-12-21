
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcMG5EPOv18MkTOxykxokL6jwpSkSGmX4",
  authDomain: "zenith-b6081.firebaseapp.com",
  projectId: "zenith-b6081",
  storageBucket: "zenith-b6081.firebasestorage.app",
  messagingSenderId: "698310324806",
  appId: "1:698310324806:web:b34348eede091681e39047",
  measurementId: "G-NCBBPBR6CL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export Firestore instance as 'db' for use in database services
export const db = getFirestore(app);
