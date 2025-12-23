import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * Authentication Service
 * 
 * Supports both Email/Password and Google Sign-In authentication.
 * 
 * SETUP REQUIRED:
 * 1. Enable Email/Password in Firebase Console > Authentication > Sign-in method
 * 2. Enable Google in Firebase Console > Authentication > Sign-in method
 */

export const AuthService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, pass: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      console.error('[AUTH] Email sign-in failed:', error.code);
      throw error;
    }
  },

  /**
   * Create new user with email and password
   */
  signUp: async (email: string, pass: string) => {
    try {
      return await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      console.error('[AUTH] Sign-up failed:', error.code);
      throw error;
    }
  },

  /**
   * Update current user's password
   * Note: User must have recently signed in to perform this operation
   */
  updateUserPassword: async (newPass: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("მომხმარებელი არ არის ავტორიზებული");
    
    try {
      await updatePassword(user, newPass);
      console.log('[AUTH] Password updated successfully');
    } catch (error: any) {
      console.error('[AUTH] Password update failed:', error.code);
      throw error;
    }
  },

  /**
   * Sign in with Google OAuth
   * Opens a popup for Google account selection
   */
  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    
    // Optional: Customize Google sign-in
    provider.addScope('profile');
    provider.addScope('email');
    
    // Force account selection even if user is already signed in
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      console.log('[AUTH] Google sign-in successful:', result.user.email);
      return result;
    } catch (error: any) {
      console.error('[AUTH] Google sign-in failed:', error.code);
      throw error;
    }
  },

  /**
   * Sign out current user
   */
  logout: async () => {
    try {
      await signOut(auth);
      console.log('[AUTH] User signed out');
    } catch (error: any) {
      console.error('[AUTH] Sign out failed:', error);
      throw error;
    }
  },

  /**
   * Listen to authentication state changes
   * Returns an unsubscribe function
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[AUTH] User authenticated:', user.email);
      } else {
        console.log('[AUTH] User signed out');
      }
      callback(user);
    });
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return auth.currentUser !== null;
  }
};