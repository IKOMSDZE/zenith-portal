
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * NOTE: For "signInWithEmailAndPassword" and Google login to work, you MUST enable 
 * the corresponding sign-in providers in your Firebase Console 
 * under Authentication > Sign-in method.
 */

export const AuthService = {
  signIn: async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email.trim(), pass);
  },

  signUp: async (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email.trim(), pass);
  },

  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },

  logout: async () => {
    return signOut(auth);
  },

  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};
