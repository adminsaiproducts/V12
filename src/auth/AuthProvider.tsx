import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_DOMAIN = 'saiproducts.co.jp';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if email domain is allowed
        const email = user.email || '';
        if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setUser(user);
        } else {
          // Sign out if domain not allowed
          firebaseSignOut(auth);
          setUser(null);
          console.warn('Access denied: Invalid email domain');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: ALLOWED_DOMAIN, // Restrict to domain
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';

      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await firebaseSignOut(auth);
        throw new Error(`${ALLOWED_DOMAIN} のメールアドレスでログインしてください`);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
