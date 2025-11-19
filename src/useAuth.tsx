// Custom hook for Firebase Authentication
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  IdTokenResult
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface UserProfile {
  user_id: number;
  firebase_uid: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  profile_picture: string | null;
  created_at: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  syncUserToBackend: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get ID token
      const tokenResult: IdTokenResult = await user.getIdTokenResult();
      const token = tokenResult.token;
      setIdToken(token);
      
      // Sync user to backend with the token
      await syncUserToBackend({
        first_name: user.displayName?.split(' ')[0] || '',
        last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        username: user.email?.split('@')[0] || '',
        email: user.email || '',
        profile_picture: user.photoURL || null
      }, token);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const syncUserToBackend = async (userData: any, token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      console.error('No ID token available');
      return;
    }

    try {
      const usersServiceUrl = process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${usersServiceUrl}/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to sync user to backend');
      }

      const result = await response.json();
      console.log('User synced to backend:', result);
      
      // Fetch user profile from backend
      await fetchUserProfile(tokenToUse);
    } catch (error) {
      console.error('Error syncing user to backend:', error);
      throw error;
    }
  };

  const fetchUserProfile = useCallback(async (token?: string) => {
    const tokenToUse = token || idToken;
    if (!tokenToUse) {
      return;
    }

    try {
      const usersServiceUrl = process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${usersServiceUrl}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [idToken]);

  const logout = async () => {
    try {
      await signOut(auth);
      setIdToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setCurrentUser(user);
      if (user) {
        // Get fresh ID token
        try {
          const tokenResult = await user.getIdTokenResult();
          const token = tokenResult.token;
          setIdToken(token);
          // Fetch user profile from backend
          await fetchUserProfile(token);
        } catch (error) {
          console.error('Error getting ID token:', error);
        }
      } else {
        setIdToken(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    idToken,
    loading,
    signInWithGoogle,
    logout,
    syncUserToBackend
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

