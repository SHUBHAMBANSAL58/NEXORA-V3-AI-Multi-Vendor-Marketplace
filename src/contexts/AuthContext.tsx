import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.js';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  idToken: string | null;
  isSigningIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  signOutUser: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  authReady: false,
  idToken: null,
  isSigningIn: false,
  authError: null,
  signInWithGoogle: async () => null,
  signOutUser: async () => {},
  refreshToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) {
      setIdToken(null);
      return null;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      setIdToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<FirebaseUser | null> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const token = await credential.user.getIdToken();
      setIdToken(token);
      setFirebaseUser(credential.user);
      return credential.user;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google Sign-In could not be completed.';
      setAuthError(message);
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async (): Promise<void> => {
    setAuthError(null);
    await signOut(auth);
    setIdToken(null);
    setFirebaseUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authReady,
        idToken,
        isSigningIn,
        authError,
        signInWithGoogle,
        signOutUser,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
